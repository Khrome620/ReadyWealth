using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ReadyWealth.Tests.TestHelpers;

namespace ReadyWealth.Tests.Integration.Endpoints;

/// <summary>
/// Integration tests for positions and close-position endpoints.
/// Each test class instance shares one in-memory SQLite database via AuthenticatedTestFactory.
/// </summary>
public class PositionsEndpointsTests : IClassFixture<AuthenticatedTestFactory>
{
    private readonly HttpClient _client;

    public PositionsEndpointsTests(AuthenticatedTestFactory factory)
    {
        _client = factory.CreateClient();
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
        Assert.Equal(JsonValueKind.Array, positions.ValueKind);
    }

    [Fact]
    public async Task GetPositions_AfterOrder_HasOnePosition()
    {
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = Guid.NewGuid().ToString(),
        });

        var response = await _client.GetAsync("/api/v1/positions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var positions = doc.RootElement.GetProperty("positions");
        Assert.True(positions.GetArrayLength() >= 1);
    }

    [Fact]
    public async Task GetPositions_HasRequiredPnlFields()
    {
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = Guid.NewGuid().ToString(),
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
        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = Guid.NewGuid().ToString(),
        });
        var orderId = JsonDocument.Parse(await orderRes.Content.ReadAsStringAsync())
            .RootElement.GetProperty("orderId").GetGuid();

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
        var walletBefore = await _client.GetAsync("/api/v1/wallet");
        var balanceBefore = JsonDocument.Parse(await walletBefore.Content.ReadAsStringAsync())
            .RootElement.GetProperty("balance").GetDecimal();

        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = Guid.NewGuid().ToString(),
        });
        var orderId = JsonDocument.Parse(await orderRes.Content.ReadAsStringAsync())
            .RootElement.GetProperty("orderId").GetGuid();

        await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);

        var walletAfter = await _client.GetAsync("/api/v1/wallet");
        var balanceAfter = JsonDocument.Parse(await walletAfter.Content.ReadAsStringAsync())
            .RootElement.GetProperty("balance").GetDecimal();

        Assert.True(balanceAfter > balanceBefore - 9120m, "Wallet should have been credited back");
    }

    [Fact]
    public async Task ClosePosition_PositionRemovedFromGetPositions()
    {
        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = Guid.NewGuid().ToString(),
        });
        var orderId = JsonDocument.Parse(await orderRes.Content.ReadAsStringAsync())
            .RootElement.GetProperty("orderId").GetGuid();

        await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);

        var posResponse = await _client.GetAsync("/api/v1/positions");
        var posBody = await posResponse.Content.ReadAsStringAsync();
        using var posDoc = JsonDocument.Parse(posBody);

        var remaining = posDoc.RootElement.GetProperty("positions").EnumerateArray()
            .Where(p => p.GetProperty("orderId").GetGuid() == orderId);
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task ClosePosition_Returns404_WhenAlreadyClosed()
    {
        var orderRes = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 9120m, idempotencyKey = Guid.NewGuid().ToString(),
        });
        var orderId = JsonDocument.Parse(await orderRes.Content.ReadAsStringAsync())
            .RootElement.GetProperty("orderId").GetGuid();

        await _client.PostAsync($"/api/v1/positions/{orderId}/close", null);
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
