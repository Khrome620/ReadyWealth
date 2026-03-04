using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Dtos;
using ReadyWealth.Api.Persistence;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Tests.Unit.Services;

/// <summary>
/// Unit tests for PaperOrderService. Each test gets its own in-memory SQLite database
/// so there is no shared state between tests.
/// </summary>
public class PaperOrderServiceTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private AppDbContext _db = null!;
    private MockMarketDataService _market = null!;
    private PaperOrderService _svc = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        await _connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new AppDbContext(options);
        await _db.Database.EnsureCreatedAsync();

        _market = new MockMarketDataService();
        _svc = new PaperOrderService(_db, _market);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private PlaceOrderRequest ValidRequest(
        string ticker = "SM",
        string type = "long",
        decimal amount = 5000m,
        string? key = null) =>
        new(ticker, type, amount, key ?? Guid.NewGuid().ToString());

    // ── Happy-path tests ──────────────────────────────────────────────────────

    [Fact]
    public async Task PlaceOrderAsync_ValidLongOrder_ReturnsResponse()
    {
        var response = await _svc.PlaceOrderAsync(ValidRequest("SM", "long", 5000m));

        Assert.Equal("SM", response.Ticker);
        Assert.Equal("Long", response.Type);
        Assert.Equal(5000m, response.Amount);
        Assert.True(response.Shares > 0);
        Assert.True(response.EntryPrice > 0);
        Assert.Equal("Open", response.Status);
        Assert.Equal(95_000m, response.WalletBalance);
    }

    [Fact]
    public async Task PlaceOrderAsync_ValidShortOrder_ReturnsResponse()
    {
        var response = await _svc.PlaceOrderAsync(ValidRequest("ALI", "short", 3000m));

        Assert.Equal("Short", response.Type);
        Assert.Equal(97_000m, response.WalletBalance);
    }

    [Fact]
    public async Task PlaceOrderAsync_DeductsWalletBalance()
    {
        await _svc.PlaceOrderAsync(ValidRequest("SM", "long", 10_000m));

        var wallet = await _db.Wallets.FindAsync(AppDbContext.SeedWalletId);
        Assert.Equal(90_000m, wallet!.Balance);
    }

    [Fact]
    public async Task PlaceOrderAsync_CreatesOrderRecord()
    {
        var response = await _svc.PlaceOrderAsync(ValidRequest("BDO", "long", 2000m));

        var order = await _db.Orders.FindAsync(response.OrderId);
        Assert.NotNull(order);
        Assert.Equal("BDO", order.Ticker);
        Assert.Equal(OrderStatus.Open, order.Status);
    }

    [Fact]
    public async Task PlaceOrderAsync_CreatesTransactionRecord()
    {
        var response = await _svc.PlaceOrderAsync(ValidRequest("BPI", "short", 4000m));

        var tx = _db.Transactions.SingleOrDefault(t => t.OrderId == response.OrderId);
        Assert.NotNull(tx);
        Assert.Equal(TransactionStatus.Open, tx.Status);
    }

    [Fact]
    public async Task PlaceOrderAsync_SharesEqualsAmountDividedByEntryPrice()
    {
        var response = await _svc.PlaceOrderAsync(ValidRequest("SM", "long", 9000m));

        var expectedShares = Math.Round(9000m / response.EntryPrice, 6);
        Assert.Equal(expectedShares, response.Shares);
    }

    // ── Validation failures ───────────────────────────────────────────────────

    [Fact]
    public async Task PlaceOrderAsync_UnknownTicker_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _svc.PlaceOrderAsync(ValidRequest("XXXXXXX", "long", 1000m)));
    }

    [Fact]
    public async Task PlaceOrderAsync_InvalidOrderType_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _svc.PlaceOrderAsync(ValidRequest("SM", "buy", 1000m)));
    }

    [Fact]
    public async Task PlaceOrderAsync_ZeroAmount_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _svc.PlaceOrderAsync(ValidRequest("SM", "long", 0m)));
    }

    [Fact]
    public async Task PlaceOrderAsync_AmountExceedsBalance_Throws()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _svc.PlaceOrderAsync(ValidRequest("SM", "long", 200_000m)));
    }

    [Fact]
    public async Task PlaceOrderAsync_AmountExactlyEqualsBalance_Succeeds()
    {
        var response = await _svc.PlaceOrderAsync(ValidRequest("SM", "long", 100_000m));
        Assert.Equal(0m, response.WalletBalance);
    }

    // ── Idempotency ───────────────────────────────────────────────────────────

    [Fact]
    public async Task PlaceOrderAsync_DuplicateKeyWithin3Seconds_ReturnsCachedResponse()
    {
        var key = Guid.NewGuid().ToString();
        var first = await _svc.PlaceOrderAsync(ValidRequest("SM", "long", 5000m, key));
        var second = await _svc.PlaceOrderAsync(ValidRequest("SM", "long", 5000m, key));

        Assert.Equal(first.OrderId, second.OrderId);
        // Balance deducted only once
        var wallet = await _db.Wallets.FindAsync(AppDbContext.SeedWalletId);
        Assert.Equal(95_000m, wallet!.Balance);
    }

    // ── GetOrdersAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetOrdersAsync_ReturnsOrdersReverseChronological()
    {
        await _svc.PlaceOrderAsync(ValidRequest("SM", "long", 1000m));
        await Task.Delay(5); // ensure distinct timestamps
        await _svc.PlaceOrderAsync(ValidRequest("ALI", "short", 2000m));

        var orders = (await _svc.GetOrdersAsync()).ToList();
        Assert.Equal(2, orders.Count);
        Assert.True(orders[0].PlacedAt >= orders[1].PlacedAt);
    }

    [Fact]
    public async Task GetOrdersAsync_EmptyWhenNoOrders()
    {
        var orders = await _svc.GetOrdersAsync();
        Assert.Empty(orders);
    }

    [Fact]
    public async Task ClosePositionAsync_ThrowsNotImplementedException()
    {
        await Assert.ThrowsAsync<NotImplementedException>(
            () => _svc.ClosePositionAsync(Guid.NewGuid()));
    }
}
