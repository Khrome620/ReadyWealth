using ReadyWealth.Api.Services;

namespace ReadyWealth.Tests.Unit.Services;

public class MockMarketDataServiceTests
{
    [Fact]
    public async Task GetAllStocksAsync_Returns20Stocks()
    {
        var svc = new MockMarketDataService();

        var stocks = (await svc.GetAllStocksAsync()).ToList();

        Assert.Equal(20, stocks.Count);
    }

    [Fact]
    public async Task GetAllStocksAsync_AllStocksHaveRequiredFields()
    {
        var svc = new MockMarketDataService();

        var stocks = (await svc.GetAllStocksAsync()).ToList();

        Assert.All(stocks, s =>
        {
            Assert.False(string.IsNullOrWhiteSpace(s.Ticker));
            Assert.False(string.IsNullOrWhiteSpace(s.Name));
            Assert.True(s.Price > 0);
            Assert.True(s.Volume > 0);
        });
    }

    [Fact]
    public async Task GetMarketStatusAsync_MatchesExpectedPHTLogic()
    {
        var svc = new MockMarketDataService();
        var result = await svc.GetMarketStatusAsync();

        // Independently compute expected open/closed based on current PHT time
        var pht = TimeZoneInfo.FindSystemTimeZoneById(
            OperatingSystem.IsWindows() ? "Singapore Standard Time" : "Asia/Singapore");
        var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, pht);
        var isWeekday = now.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday;
        var timeNow = TimeOnly.FromTimeSpan(now.TimeOfDay);
        var expectedOpen = isWeekday && timeNow >= new TimeOnly(9, 30) && timeNow <= new TimeOnly(15, 30);

        Assert.Equal(expectedOpen, result);
    }

    [Fact]
    public async Task GetLastUpdatedAsync_ReturnsRecentTimestamp()
    {
        var before = DateTimeOffset.UtcNow;
        var svc = new MockMarketDataService();
        // Calling GetAllStocksAsync updates _lastUpdated via Fluctuate()
        await svc.GetAllStocksAsync();

        var lastUpdated = await svc.GetLastUpdatedAsync();
        var after = DateTimeOffset.UtcNow;

        Assert.InRange(lastUpdated, before, after);
    }

    [Fact]
    public async Task GetGainersAsync_ReturnsOnlyPositiveChangePct()
    {
        var svc = new MockMarketDataService();

        var gainers = (await svc.GetGainersAsync()).ToList();

        Assert.NotEmpty(gainers);
        Assert.All(gainers, s => Assert.True(s.ChangePct > 0));
    }

    [Fact]
    public async Task GetGainersAsync_SortedByChangePctDescending()
    {
        var svc = new MockMarketDataService();

        var gainers = (await svc.GetGainersAsync()).ToList();

        for (int i = 0; i < gainers.Count - 1; i++)
            Assert.True(gainers[i].ChangePct >= gainers[i + 1].ChangePct,
                $"Expected gainers[{i}].ChangePct ({gainers[i].ChangePct}) >= gainers[{i + 1}].ChangePct ({gainers[i + 1].ChangePct})");
    }

    [Fact]
    public async Task GetGainersAsync_ReturnsAtMost10Stocks()
    {
        var svc = new MockMarketDataService();

        var gainers = (await svc.GetGainersAsync()).ToList();

        Assert.True(gainers.Count <= 10);
    }

    [Fact]
    public async Task GetLosersAsync_ReturnsOnlyNegativeChangePct()
    {
        var svc = new MockMarketDataService();

        var losers = (await svc.GetLosersAsync()).ToList();

        Assert.NotEmpty(losers);
        Assert.All(losers, s => Assert.True(s.ChangePct < 0));
    }

    [Fact]
    public async Task GetLosersAsync_SortedByChangePctAscending()
    {
        var svc = new MockMarketDataService();

        var losers = (await svc.GetLosersAsync()).ToList();

        for (int i = 0; i < losers.Count - 1; i++)
            Assert.True(losers[i].ChangePct <= losers[i + 1].ChangePct,
                $"Expected losers[{i}].ChangePct ({losers[i].ChangePct}) <= losers[{i + 1}].ChangePct ({losers[i + 1].ChangePct})");
    }

    [Fact]
    public async Task GetMostActiveAsync_SortedByVolumeDescending()
    {
        var svc = new MockMarketDataService();

        var active = (await svc.GetMostActiveAsync()).ToList();

        Assert.NotEmpty(active);
        for (int i = 0; i < active.Count - 1; i++)
            Assert.True(active[i].Volume >= active[i + 1].Volume,
                $"Expected active[{i}].Volume ({active[i].Volume}) >= active[{i + 1}].Volume ({active[i + 1].Volume})");
    }

    [Fact]
    public async Task GetMostActiveAsync_ReturnsAtMost10Stocks()
    {
        var svc = new MockMarketDataService();

        var active = (await svc.GetMostActiveAsync()).ToList();

        Assert.True(active.Count <= 10);
    }

    [Fact]
    public async Task GetAllStocksAsync_PricesFluctuateBetweenCalls()
    {
        var svc = new MockMarketDataService();

        var first = (await svc.GetAllStocksAsync()).ToList();
        var second = (await svc.GetAllStocksAsync()).ToList();

        // With ±0.2% fluctuation, prices should differ across calls (not deterministic)
        // We check that at least one price changed (statistically guaranteed)
        var anyChanged = first.Zip(second).Any(pair => pair.First.Price != pair.Second.Price);
        Assert.True(anyChanged, "Expected prices to fluctuate between calls");
    }
}
