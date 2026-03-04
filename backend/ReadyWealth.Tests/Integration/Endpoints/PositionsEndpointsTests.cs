using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Tests.Integration.Endpoints;

/// <summary>
/// Each test in this class gets its own in-memory SQLite database
/// to ensure full isolation.
/// </summary>
public class PositionsEndpointsTests : IAsyncLifetime
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

                services.AddDbContext<AppDbContext>(options =>
                    options.UseSqlite(_connection));
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

    // ── GET /api/v1/positions ─────────────────────────────────────────────────

    [Fact]
    public async Task GetPositions_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/positions");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetPositions_EmptyArray_Initially()
    {
        var response = await _client.GetAsync("/api/v1/positions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var positions = doc.RootElement.GetProperty("positions");
        Assert.Equal(0, positions.GetArrayLength());
    }

    [Fact]
    public async Task GetPositions_AfterOrder_HasOnePosition()
    {
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = (string?)null,
        });

        var response = await _client.GetAsync("/api/v1/positions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var positions = doc.RootElement.GetProperty("positions");
        Assert.Equal(1, positions.GetArrayLength());
    }

    [Fact]
    public async Task GetPositions_HasRequiredPnlFields()
    {
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = (string?)null,
        });

        var response = await _client.GetAsync("/api/v1/positions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var pos = doc.RootElement.GetProperty("positions").EnumerateArray().First();

        Assert.True(pos.TryGetProperty("orderId", out _), "Missing orderId");
        Assert.True(pos.TryGetProperty("ticker", out _), "Missing ticker");
        Assert.True(pos.TryGetProperty("type", out _), "Missing type");
        Assert.True(pos.TryGetProperty("investedAmount", out _), "Missing investedAmount");
        Assert.True(pos.TryGetProperty("shares", out _), "Missing shares");
        Assert.True(pos.TryGetProperty("entryPrice", out _), "Missing entryPrice");
        Assert.True(pos.TryGetProperty("currentPrice", out _), "Missing currentPrice");
        Assert.True(pos.TryGetProperty("currentValue", out _), "Missing currentValue");
        Assert.True(pos.TryGetProperty("unrealizedPnl", out _), "Missing unrealizedPnl");
        Assert.True(pos.TryGetProperty("unrealizedPnlPct", out _), "Missing unrealizedPnlPct");
    }

    // ── POST /api/v1/positions/{orderId}/close ────────────────────────────────

    [Fact]
    public async Task ClosePosition_Returns200_WithCorrectShape()
    {
        // Place order, get orderId
        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = (string?)null,
        });
        var orderData = await orderRes.Content.ReadAsStringAsync();
        using var orderDoc = JsonDocument.Parse(orderData);
        var orderId = orderDoc.RootElement.GetProperty("orderId").GetGuid();

        // Close the position
        var closeRes = await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);

        Assert.Equal(HttpStatusCode.OK, closeRes.StatusCode);
        var closeBody = await closeRes.Content.ReadAsStringAsync();
        using var closeDoc = JsonDocument.Parse(closeBody);

        Assert.True(closeDoc.RootElement.TryGetProperty("realizedPnl", out _), "Missing realizedPnl");
        Assert.True(closeDoc.RootElement.TryGetProperty("walletBalance", out _), "Missing walletBalance");
        Assert.True(closeDoc.RootElement.TryGetProperty("closingPrice", out _), "Missing closingPrice");
        Assert.True(closeDoc.RootElement.TryGetProperty("closedAt", out _), "Missing closedAt");
    }

    [Fact]
    public async Task ClosePosition_CreditsWallet()
    {
        // Get wallet balance before order
        var walletBefore = await _client.GetAsync("/api/v1/wallet");
        var walletData = await walletBefore.Content.ReadAsStringAsync();
        var balanceBefore = JsonDocument.Parse(walletData).RootElement.GetProperty("balance").GetDecimal();

        // Place 9120 order
        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = (string?)null,
        });
        var orderId = JsonDocument.Parse(await orderRes.Content.ReadAsStringAsync())
            .RootElement.GetProperty("orderId").GetGuid();

        // Close position
        await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);

        // Wallet balance should have been debited by 9120 then credited by currentValue (≈9120)
        var walletAfter = await _client.GetAsync("/api/v1/wallet");
        var balanceAfter = JsonDocument.Parse(await walletAfter.Content.ReadAsStringAsync())
            .RootElement.GetProperty("balance").GetDecimal();

        // Balance should be close to original (slight change due to price fluctuation)
        // Just verify it's not the same as after-order balance (i.e., wallet was credited)
        Assert.True(balanceAfter > balanceBefore - 9120m, "Wallet should have been credited back");
    }

    [Fact]
    public async Task ClosePosition_PositionRemovedFromGetPositions()
    {
        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = (string?)null,
        });
        var orderId = JsonDocument.Parse(await orderRes.Content.ReadAsStringAsync())
            .RootElement.GetProperty("orderId").GetGuid();

        await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);

        var posResponse = await _client.GetAsync("/api/v1/positions");
        var posBody = await posResponse.Content.ReadAsStringAsync();
        using var posDoc = JsonDocument.Parse(posBody);

        Assert.Equal(0, posDoc.RootElement.GetProperty("positions").GetArrayLength());
    }

    [Fact]
    public async Task ClosePosition_Returns404_WhenAlreadyClosed()
    {
        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = (string?)null,
        });
        var orderId = JsonDocument.Parse(await orderRes.Content.ReadAsStringAsync())
            .RootElement.GetProperty("orderId").GetGuid();

        // Close once
        await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);

        // Close again → should 404
        var second = await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);
        Assert.Equal(HttpStatusCode.NotFound, second.StatusCode);
    }

    [Fact]
    public async Task ClosePosition_Returns404_ForUnknownOrderId()
    {
        var fakeId = Guid.NewGuid();
        var response = await _client.PostAsync($"/api/v1/positions/{fakeId}/close", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
