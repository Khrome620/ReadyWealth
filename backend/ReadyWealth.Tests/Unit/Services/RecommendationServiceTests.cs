using NSubstitute;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Tests.Unit.Services;

public class RecommendationServiceTests
{
    // ── Fixtures ──────────────────────────────────────────────────────────────

    private static Stock S(string ticker, decimal changePct, long volume, decimal price = 100m) =>
        new(ticker, $"{ticker} Corp.", price, 0m, changePct, volume, DateTimeOffset.UtcNow);

    /// <summary>
    /// 5 positive + 2 negative stocks; clear top-3 movers and top-2 volume (non-overlapping).
    /// TOP MOVERS by changePct: A(5%), B(4%), C(2%)
    /// TOP VOLUME not in movers: E(9000), F(8000)
    /// </summary>
    private static readonly Stock[] _stocks =
    [
        S("A", 5.0m,  1_000),  // mover #1 — high confidence (>3)
        S("B", 4.0m,  2_000),  // mover #2 — high confidence
        S("C", 2.0m,  3_000),  // mover #3 — medium confidence
        S("D", 1.5m,  4_000),  // mover #4 — bumped out
        S("E", 0.0m,  9_000),  // top volume #1 (not a mover)
        S("F", -1.0m, 8_000),  // top volume #2 (not a mover; negative changePct)
        S("G", -2.0m, 100),    // irrelevant
    ];

    private static IMarketDataService MakeMarket(IEnumerable<Stock>? stocks = null)
    {
        var svc = Substitute.For<IMarketDataService>();
        svc.GetAllStocksAsync().Returns(Task.FromResult<IEnumerable<Stock>>(stocks ?? _stocks));
        return svc;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Returns_top3_movers_by_positive_changePct()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        var movers = recs.Where(r => r.Reason == "Strong upward momentum").ToList();
        Assert.Equal(3, movers.Count);

        // Tickers A, B, C should appear (top 3 positive changePct)
        Assert.Contains("A", movers.Select(r => r.Ticker));
        Assert.Contains("B", movers.Select(r => r.Ticker));
        Assert.Contains("C", movers.Select(r => r.Ticker));
    }

    [Fact]
    public async Task Movers_have_Strong_upward_momentum_reason()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        var movers = recs.Where(r => r.Ticker is "A" or "B" or "C").ToList();
        Assert.All(movers, r => Assert.Equal("Strong upward momentum", r.Reason));
    }

    [Fact]
    public async Task Top_volume_entries_have_High_trading_activity_reason()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        var volume = recs.Where(r => r.Reason == "High trading activity").ToList();
        Assert.Equal(2, volume.Count);

        // E and F are top volume not in movers
        Assert.Contains("E", volume.Select(r => r.Ticker));
        Assert.Contains("F", volume.Select(r => r.Ticker));
    }

    [Fact]
    public async Task Volume_entries_are_not_in_topMovers_set()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        var moverTickers = recs
            .Where(r => r.Reason == "Strong upward momentum")
            .Select(r => r.Ticker)
            .ToHashSet();

        var volumeTickers = recs
            .Where(r => r.Reason == "High trading activity")
            .Select(r => r.Ticker);

        Assert.DoesNotContain(volumeTickers, t => moverTickers.Contains(t));
    }

    [Fact]
    public async Task Result_is_deduped_to_max_5_items()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        Assert.True(recs.Count <= 5);
        Assert.Equal(recs.Select(r => r.Ticker).Distinct().Count(), recs.Count);
    }

    [Fact]
    public async Task Confidence_high_when_changePct_greater_than_3()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        // A=5%, B=4% should be high
        Assert.Equal("high", recs.First(r => r.Ticker == "A").Confidence);
        Assert.Equal("high", recs.First(r => r.Ticker == "B").Confidence);
    }

    [Fact]
    public async Task Confidence_medium_when_changePct_between_1_and_3_inclusive()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        // C=2% should be medium
        Assert.Equal("medium", recs.First(r => r.Ticker == "C").Confidence);
    }

    [Fact]
    public async Task Confidence_low_when_changePct_below_1()
    {
        var stocks = new[]
        {
            S("X", 0.5m, 1_000),  // mover but low confidence (<1%)
            S("Y", 0.4m, 2_000),
            S("Z", 0.3m, 3_000),
        };
        var svc = new RecommendationService(MakeMarket(stocks));
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        Assert.All(recs.Where(r => r.Reason == "Strong upward momentum"),
            r => Assert.Equal("low", r.Confidence));
    }

    [Fact]
    public async Task Returns_empty_when_no_stocks()
    {
        var svc = new RecommendationService(MakeMarket([]));
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        Assert.Empty(recs);
    }

    [Fact]
    public async Task Returns_fewer_than_3_when_insufficient_positive_movers_and_volume()
    {
        // Only 2 stocks total
        var stocks = new[] { S("P", -1m, 1000), S("Q", -2m, 2000) };
        var svc = new RecommendationService(MakeMarket(stocks));
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        // 0 topMovers (no positive changePct) + 2 topVolume = 2 items
        Assert.Equal(2, recs.Count);
    }

    [Fact]
    public async Task Movers_sorted_descending_by_changePct()
    {
        var svc = new RecommendationService(MakeMarket());
        var recs = (await svc.GetRecommendationsAsync()).ToList();

        var movers = recs.Where(r => r.Reason == "Strong upward momentum").ToList();
        var tickers = movers.Select(r => r.Ticker).ToList();

        // A(5%) should come before B(4%) before C(2%)
        Assert.Equal(0, tickers.IndexOf("A"));
        Assert.Equal(1, tickers.IndexOf("B"));
        Assert.Equal(2, tickers.IndexOf("C"));
    }
}
