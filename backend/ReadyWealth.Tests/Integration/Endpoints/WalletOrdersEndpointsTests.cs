using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Tests.Integration.Endpoints;

public class WalletOrdersEndpointsTests : IClassFixture<WalletOrdersEndpointsTests.TestFactory>
{
    private readonly HttpClient _client;

    public WalletOrdersEndpointsTests(TestFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── GET /api/v1/wallet ────────────────────────────────────────────────────

    [Fact]
    public async Task GetWallet_Returns200WithExpectedShape()
    {
        var response = await _client.GetAsync("/api/v1/wallet");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("id", out _));
        Assert.True(root.TryGetProperty("balance", out var balance));
        Assert.True(root.TryGetProperty("updatedAt", out _));
        Assert.Equal(100_000m, balance.GetDecimal());
    }

    // ── POST /api/v1/orders ───────────────────────────────────────────────────

    [Fact]
    public async Task PlaceOrder_ValidLongOrder_Returns201WithShape()
    {
        var payload = new { ticker = "SM", type = "long", amount = 5000m, idempotencyKey = Guid.NewGuid().ToString() };
        var response = await _client.PostAsJsonAsync("/api/v1/orders", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("orderId", out _));
        Assert.True(root.TryGetProperty("walletBalance", out var bal));
        Assert.Equal(95_000m, bal.GetDecimal());
        Assert.True(root.TryGetProperty("shares", out var shares));
        Assert.True(shares.GetDecimal() > 0);
    }

    [Fact]
    public async Task PlaceOrder_UnknownTicker_Returns400()
    {
        var payload = new { ticker = "XXXXXXX", type = "long", amount = 1000m, idempotencyKey = Guid.NewGuid().ToString() };
        var response = await _client.PostAsJsonAsync("/api/v1/orders", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.TryGetProperty("error", out _));
    }

    [Fact]
    public async Task PlaceOrder_AmountExceedsBalance_Returns400()
    {
        var payload = new { ticker = "SM", type = "long", amount = 999_999m, idempotencyKey = Guid.NewGuid().ToString() };
        var response = await _client.PostAsJsonAsync("/api/v1/orders", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PlaceOrder_DuplicateKey_Returns201WithSameOrderId()
    {
        var key = Guid.NewGuid().ToString();
        var payload = new { ticker = "SM", type = "long", amount = 1000m, idempotencyKey = key };

        var first = await _client.PostAsJsonAsync("/api/v1/orders", payload);
        var second = await _client.PostAsJsonAsync("/api/v1/orders", payload);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);

        var firstBody = JsonDocument.Parse(await first.Content.ReadAsStringAsync());
        var secondBody = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        var firstId = firstBody.RootElement.GetProperty("orderId").GetString();
        var secondId = secondBody.RootElement.GetProperty("orderId").GetString();
        Assert.Equal(firstId, secondId);
    }

    // ── GET /api/v1/orders ────────────────────────────────────────────────────

    [Fact]
    public async Task GetOrders_InitiallyEmpty_Returns200WithEmptyArray()
    {
        var response = await _client.GetAsync("/api/v1/orders");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);
    }

    [Fact]
    public async Task GetOrders_AfterPlacement_ReturnsOrder()
    {
        await _client.PostAsJsonAsync("/api/v1/orders",
            new { ticker = "BDO", type = "long", amount = 2000m, idempotencyKey = Guid.NewGuid().ToString() });

        var response = await _client.GetAsync("/api/v1/orders");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var orders = doc.RootElement.EnumerateArray().ToList();
        Assert.NotEmpty(orders);
        Assert.Equal("BDO", orders[0].GetProperty("ticker").GetString());
    }

    // ── Test factory ──────────────────────────────────────────────────────────

    public class TestFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        private readonly SqliteConnection _connection = new("Data Source=:memory:");

        public async Task InitializeAsync() => await _connection.OpenAsync();

        public new async Task DisposeAsync()
        {
            await _connection.DisposeAsync();
            await base.DisposeAsync();
        }

        protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(o => o.UseSqlite(_connection));
            });
        }
    }
}
