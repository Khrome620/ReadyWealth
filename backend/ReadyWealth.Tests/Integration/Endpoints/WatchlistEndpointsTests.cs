using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Tests.Integration.Endpoints;

/// <summary>Each test gets its own in-memory database for full isolation.</summary>
public class WatchlistEndpointsTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private WebApplicationFactory<Program> _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor is not null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(o => o.UseSqlite(_connection));
            });
        });
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
        await _connection.DisposeAsync();
    }

    // ── GET /api/v1/watchlist ─────────────────────────────────────────────────

    [Fact]
    public async Task GetWatchlist_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/watchlist");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetWatchlist_EmptyArray_Initially()
    {
        var response = await _client.GetAsync("/api/v1/watchlist");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var watchlist = doc.RootElement.GetProperty("watchlist");
        Assert.Equal(0, watchlist.GetArrayLength());
    }

    [Fact]
    public async Task GetWatchlist_AfterAdd_HasOneEntry()
    {
        await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "SM" });

        var response = await _client.GetAsync("/api/v1/watchlist");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.Equal(1, doc.RootElement.GetProperty("watchlist").GetArrayLength());
    }

    [Fact]
    public async Task GetWatchlist_IncludesStockDataFields()
    {
        await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "SM" });

        var response = await _client.GetAsync("/api/v1/watchlist");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var item = doc.RootElement.GetProperty("watchlist").EnumerateArray().First();

        Assert.True(item.TryGetProperty("ticker", out _), "Missing 'ticker'");
        Assert.True(item.TryGetProperty("name", out _), "Missing 'name'");
        Assert.True(item.TryGetProperty("price", out _), "Missing 'price'");
        Assert.True(item.TryGetProperty("isAutoAdded", out _), "Missing 'isAutoAdded'");
        Assert.True(item.TryGetProperty("addedAt", out _), "Missing 'addedAt'");
    }

    // ── POST /api/v1/watchlist ────────────────────────────────────────────────

    [Fact]
    public async Task AddToWatchlist_Returns201()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "SM" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddToWatchlist_Returns409_WhenDuplicate()
    {
        await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "ALI" });
        var second = await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "ALI" });

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task AddToWatchlist_Returns400_UnknownTicker()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "UNKNOWN" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── DELETE /api/v1/watchlist/{ticker} ─────────────────────────────────────

    [Fact]
    public async Task DeleteWatchlist_Returns204()
    {
        await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "BDO" });
        var response = await _client.DeleteAsync("/api/v1/watchlist/BDO");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteWatchlist_RemovesEntry()
    {
        await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "JFC" });
        await _client.DeleteAsync("/api/v1/watchlist/JFC");

        var response = await _client.GetAsync("/api/v1/watchlist");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.Equal(0, doc.RootElement.GetProperty("watchlist").GetArrayLength());
    }

    [Fact]
    public async Task DeleteWatchlist_Returns404_WhenNotFound()
    {
        var response = await _client.DeleteAsync("/api/v1/watchlist/MISSING");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
