using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Dtos;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Api.Services;

public class PaperOrderService(AppDbContext db, IMarketDataService market) : IPaperOrderService
{
    // Static so the idempotency window survives across Scoped instances within the same process
    private static readonly ConcurrentDictionary<string, (DateTime Timestamp, PlaceOrderResponse Response)>
        _idempotency = new();

    public async Task<PlaceOrderResponse> PlaceOrderAsync(PlaceOrderRequest request)
    {
        // ── Idempotency check ────────────────────────────────────────────────
        if (request.IdempotencyKey is not null
            && _idempotency.TryGetValue(request.IdempotencyKey, out var cached)
            && (DateTime.UtcNow - cached.Timestamp).TotalSeconds < 3)
        {
            return cached.Response;
        }

        // ── Validate ticker ──────────────────────────────────────────────────
        var stocks = (await market.GetAllStocksAsync()).ToList();
        var stock = stocks.FirstOrDefault(s => s.Ticker.Equals(request.Ticker, StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException($"Unknown ticker: {request.Ticker}");

        // ── Validate order type ──────────────────────────────────────────────
        if (!Enum.TryParse<OrderType>(request.Type, ignoreCase: true, out var orderType))
            throw new ArgumentException($"Invalid order type '{request.Type}'. Use 'long' or 'short'.");

        // ── Validate amount ──────────────────────────────────────────────────
        if (request.Amount <= 0)
            throw new ArgumentException("Amount must be greater than zero.");

        // ── Wallet balance check ─────────────────────────────────────────────
        var wallet = await db.Wallets.FindAsync(AppDbContext.SeedWalletId)
            ?? throw new InvalidOperationException("Wallet not found.");

        if (request.Amount > wallet.Balance)
            throw new InvalidOperationException("Insufficient funds.");

        // ── Create Order + Transaction ───────────────────────────────────────
        var shares = Math.Round(request.Amount / stock.Price, 6);
        var order = new Order
        {
            Id = Guid.NewGuid(),
            Ticker = stock.Ticker,
            Type = orderType,
            Amount = request.Amount,
            Shares = shares,
            EntryPrice = stock.Price,
            Status = OrderStatus.Open,
            IdempotencyKey = request.IdempotencyKey,
            PlacedAt = DateTimeOffset.UtcNow,
        };

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Ticker = stock.Ticker,
            Type = orderType,
            Amount = request.Amount,
            Status = TransactionStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        wallet.Balance -= request.Amount;
        wallet.UpdatedAt = DateTimeOffset.UtcNow;

        db.Orders.Add(order);
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        // ── Build and cache response ─────────────────────────────────────────
        var response = new PlaceOrderResponse(
            order.Id, order.Ticker, order.Type.ToString(),
            order.Amount, order.Shares, order.EntryPrice,
            order.Status.ToString(), order.PlacedAt, wallet.Balance);

        if (request.IdempotencyKey is not null)
            _idempotency[request.IdempotencyKey] = (DateTime.UtcNow, response);

        return response;
    }

    public Task<IEnumerable<OrderDto>> GetOrdersAsync()
    {
        // AsEnumerable() materialises the query first so we can order by DateTimeOffset
        // on the client side — SQLite stores timestamps as TEXT and can't compare them
        // natively as DateTimeOffset via EF Core LINQ translation.
        var orders = db.Orders
            .AsEnumerable()
            .OrderByDescending(o => o.PlacedAt)
            .Select(o => new OrderDto(
                o.Id, o.Ticker, o.Type.ToString(),
                o.Amount, o.Shares, o.EntryPrice,
                o.Status.ToString(), o.PlacedAt, o.ClosedAt))
            .ToList();
        return Task.FromResult<IEnumerable<OrderDto>>(orders);
    }

    public Task<ClosePositionResponse> ClosePositionAsync(Guid orderId)
    {
        // Implemented in Phase 7 (US5 — Portfolio Management)
        throw new NotImplementedException("ClosePosition is implemented in Phase 7.");
    }
}
