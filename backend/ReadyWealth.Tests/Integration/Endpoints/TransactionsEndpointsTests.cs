using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Tests.Integration.Endpoints;

public class TransactionsEndpointsTests : IClassFixture<TransactionsEndpointsTests.TestFactory>
{
    private readonly HttpClient _client;

    public TransactionsEndpointsTests(TestFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private static readonly object _orderBody = new
    {
        ticker = "SM",
        type = "long",
        amount = 5000m,
        idempotencyKey = (string?)null,
    };

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTransactions_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/transactions");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetTransactions_HasTransactionsArray()
    {
        var response = await _client.GetAsync("/api/v1/transactions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("transactions", out var txArray));
        Assert.Equal(JsonValueKind.Array, txArray.ValueKind);
    }

    [Fact]
    public async Task GetTransactions_AfterOrder_CountIncreasesBy1()
    {
        // Capture count before placing the order
        int countBefore;
        {
            var before = await _client.GetAsync("/api/v1/transactions");
            var body = await before.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            countBefore = doc.RootElement.GetProperty("transactions").GetArrayLength();
        }

        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 5000m, idempotencyKey = (string?)null,
        });

        var response = await _client.GetAsync("/api/v1/transactions");
        var body2 = await response.Content.ReadAsStringAsync();
        using var doc2 = JsonDocument.Parse(body2);
        var countAfter = doc2.RootElement.GetProperty("transactions").GetArrayLength();

        Assert.Equal(countBefore + 1, countAfter);
    }

    [Fact]
    public async Task GetTransactions_EachTransactionHasRequiredFields()
    {
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 5000m, idempotencyKey = (string?)null,
        });

        var response = await _client.GetAsync("/api/v1/transactions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var tx = doc.RootElement.GetProperty("transactions").EnumerateArray().First();

        Assert.True(tx.TryGetProperty("id", out _), "Missing 'id'");
        Assert.True(tx.TryGetProperty("orderId", out _), "Missing 'orderId'");
        Assert.True(tx.TryGetProperty("ticker", out _), "Missing 'ticker'");
        Assert.True(tx.TryGetProperty("type", out _), "Missing 'type'");
        Assert.True(tx.TryGetProperty("amount", out _), "Missing 'amount'");
        Assert.True(tx.TryGetProperty("status", out _), "Missing 'status'");
        Assert.True(tx.TryGetProperty("realizedPnl", out _), "Missing 'realizedPnl'");
        Assert.True(tx.TryGetProperty("closingPrice", out _), "Missing 'closingPrice'");
        Assert.True(tx.TryGetProperty("createdAt", out _), "Missing 'createdAt'");
        Assert.True(tx.TryGetProperty("updatedAt", out _), "Missing 'updatedAt'");
    }

    [Fact]
    public async Task GetTransactions_RealizedPnl_IsNullForOpenTransaction()
    {
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 5000m, idempotencyKey = (string?)null,
        });

        var response = await _client.GetAsync("/api/v1/transactions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var tx = doc.RootElement.GetProperty("transactions").EnumerateArray().First();

        Assert.Equal(JsonValueKind.Null, tx.GetProperty("realizedPnl").ValueKind);
        Assert.Equal(JsonValueKind.Null, tx.GetProperty("closingPrice").ValueKind);
    }

    [Fact]
    public async Task GetTransactions_Status_IsOpen_ForNewOrder()
    {
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "ALI", type = "short", amount = 3000m, idempotencyKey = (string?)null,
        });

        var response = await _client.GetAsync("/api/v1/transactions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var status = doc.RootElement.GetProperty("transactions")
            .EnumerateArray().First()
            .GetProperty("status").GetString();

        Assert.Equal("open", status);
    }

    [Fact]
    public async Task GetTransactions_ReverseChronologicalOrder()
    {
        // Place two orders and verify newest appears first
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "SM", type = "long", amount = 1000m, idempotencyKey = (string?)null,
        });
        await Task.Delay(10); // ensure different timestamps
        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            ticker = "ALI", type = "long", amount = 2000m, idempotencyKey = (string?)null,
        });

        var response = await _client.GetAsync("/api/v1/transactions");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var txArray = doc.RootElement.GetProperty("transactions").EnumerateArray().ToList();

        Assert.True(txArray.Count >= 2);
        var first = txArray[0].GetProperty("createdAt").GetDateTimeOffset();
        var second = txArray[1].GetProperty("createdAt").GetDateTimeOffset();
        Assert.True(first >= second, "Expected newest transaction first");
    }

    // ── Test factory ─────────────────────────────────────────────────────────

    public class TestFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        private readonly SqliteConnection _connection =
            new SqliteConnection("Data Source=:memory:");

        public async Task InitializeAsync()
        {
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
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseSqlite(_connection));
            });
        }
    }
}
