using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Tests.Integration.Endpoints;

public class StocksEndpointsTests : IClassFixture<StocksEndpointsTests.TestFactory>
{
    private readonly HttpClient _client;

    public StocksEndpointsTests(TestFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetStocks_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/stocks");

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetStocks_ResponseHasExpectedShape()
    {
        var response = await _client.GetAsync("/api/v1/stocks");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("stocks", out var stocks), "Response missing 'stocks' field");
        Assert.True(root.TryGetProperty("marketOpen", out _), "Response missing 'marketOpen' field");
        Assert.True(root.TryGetProperty("lastUpdated", out _), "Response missing 'lastUpdated' field");
        Assert.Equal(JsonValueKind.Array, stocks.ValueKind);
        Assert.Equal(20, stocks.GetArrayLength());
    }

    [Fact]
    public async Task GetStocks_EachStockHasRequiredFields()
    {
        var response = await _client.GetAsync("/api/v1/stocks");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var stocks = doc.RootElement.GetProperty("stocks");

        foreach (var stock in stocks.EnumerateArray())
        {
            Assert.True(stock.TryGetProperty("ticker", out _), "Stock missing 'ticker'");
            Assert.True(stock.TryGetProperty("name", out _), "Stock missing 'name'");
            Assert.True(stock.TryGetProperty("price", out _), "Stock missing 'price'");
            Assert.True(stock.TryGetProperty("changePct", out _), "Stock missing 'changePct'");
            Assert.True(stock.TryGetProperty("volume", out _), "Stock missing 'volume'");
        }
    }

    [Fact]
    public async Task GetGainers_Returns200WithMarketShape()
    {
        var response = await _client.GetAsync("/api/v1/stocks/gainers");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("stocks", out _));
        Assert.True(root.TryGetProperty("marketOpen", out _));
        Assert.True(root.TryGetProperty("lastUpdated", out _));
    }

    [Fact]
    public async Task GetGainers_ReturnsOnlyPositiveChangePct()
    {
        var response = await _client.GetAsync("/api/v1/stocks/gainers");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var stocks = doc.RootElement.GetProperty("stocks");

        foreach (var stock in stocks.EnumerateArray())
        {
            var changePct = stock.GetProperty("changePct").GetDecimal();
            Assert.True(changePct > 0, $"Gainer stock {stock.GetProperty("ticker").GetString()} has non-positive changePct {changePct}");
        }
    }

    [Fact]
    public async Task GetLosers_Returns200WithMarketShape()
    {
        var response = await _client.GetAsync("/api/v1/stocks/losers");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("stocks", out _));
        Assert.True(root.TryGetProperty("marketOpen", out _));
        Assert.True(root.TryGetProperty("lastUpdated", out _));
    }

    [Fact]
    public async Task GetLosers_ReturnsOnlyNegativeChangePct()
    {
        var response = await _client.GetAsync("/api/v1/stocks/losers");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var stocks = doc.RootElement.GetProperty("stocks");

        foreach (var stock in stocks.EnumerateArray())
        {
            var changePct = stock.GetProperty("changePct").GetDecimal();
            Assert.True(changePct < 0, $"Loser stock {stock.GetProperty("ticker").GetString()} has non-negative changePct {changePct}");
        }
    }

    [Fact]
    public async Task GetMostActive_Returns200WithMarketShape()
    {
        var response = await _client.GetAsync("/api/v1/stocks/active");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("stocks", out _));
        Assert.True(root.TryGetProperty("marketOpen", out _));
        Assert.True(root.TryGetProperty("lastUpdated", out _));
    }

    [Fact]
    public async Task GetMostActive_ReturnedStocksAreSortedByVolumeDesc()
    {
        var response = await _client.GetAsync("/api/v1/stocks/active");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var stocks = doc.RootElement.GetProperty("stocks").EnumerateArray().ToList();

        for (int i = 0; i < stocks.Count - 1; i++)
        {
            var vol1 = stocks[i].GetProperty("volume").GetInt64();
            var vol2 = stocks[i + 1].GetProperty("volume").GetInt64();
            Assert.True(vol1 >= vol2, $"stocks[{i}].volume ({vol1}) should be >= stocks[{i + 1}].volume ({vol2})");
        }
    }

    // ── Test factory ────────────────────────────────────────────────────────────

    public class TestFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        private readonly SqliteConnection _connection = new("Data Source=:memory:");

        public async Task InitializeAsync()
        {
            // Keep connection open so the in-memory database persists for the test lifetime
            await _connection.OpenAsync();
        }

        public new async Task DisposeAsync()
        {
            await _connection.DisposeAsync();
            await base.DisposeAsync();
        }

        protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // Replace the real DbContext with an in-memory SQLite one
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseSqlite(_connection));
            });
        }
    }
}
