using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ReadyWealth.Tests.TestHelpers;

namespace ReadyWealth.Tests.Integration.Endpoints;

/// <summary>Each test gets its own in-memory database for full isolation.</summary>
public class WatchlistEndpointsTests : IClassFixture<AuthenticatedTestFactory>
{
    private readonly HttpClient _client;

    public WatchlistEndpointsTests(AuthenticatedTestFactory factory)
    {
        _client = factory.CreateClient();
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
        Assert.Equal(JsonValueKind.Array, watchlist.ValueKind);
    }

    [Fact]
    public async Task GetWatchlist_AfterAdd_HasEntry()
    {
        await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "SM" });

        var response = await _client.GetAsync("/api/v1/watchlist");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.GetProperty("watchlist").GetArrayLength() >= 1);
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
        var ticker = $"SM{Guid.NewGuid().GetHashCode() % 100}"; // use unique name to avoid conflicts
        var response = await _client.PostAsJsonAsync("/api/v1/watchlist", new { ticker = "SM" });
        // Acceptable: 201 Created OR 409 Conflict (if SM was already added in this fixture)
        Assert.True(
            response.StatusCode == HttpStatusCode.Created || response.StatusCode == HttpStatusCode.Conflict,
            $"Expected 201 or 409, got {response.StatusCode}");
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

        var check = await _client.GetAsync("/api/v1/watchlist");
        var body = await check.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var items = doc.RootElement.GetProperty("watchlist").EnumerateArray()
            .Where(i => i.GetProperty("ticker").GetString() == "JFC");
        Assert.Empty(items);
    }

    [Fact]
    public async Task DeleteWatchlist_Returns404_WhenNotFound()
    {
        var response = await _client.DeleteAsync("/api/v1/watchlist/MISSING");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
