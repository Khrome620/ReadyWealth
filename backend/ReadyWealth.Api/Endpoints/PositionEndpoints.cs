using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Dtos;
using ReadyWealth.Api.Persistence;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Api.Endpoints;

public static class PositionEndpoints
{
    public static IEndpointRouteBuilder MapPositionEndpoints(this IEndpointRouteBuilder app)
    {
        // ── GET /api/v1/positions ─────────────────────────────────────────────
        app.MapGet("/api/v1/positions", async (AppDbContext db, IMarketDataService market) =>
        {
            var stocks = (await market.GetAllStocksAsync())
                .ToDictionary(s => s.Ticker, StringComparer.OrdinalIgnoreCase);

            // Global Query Filter automatically scopes to the authenticated user's orders
            var positions = db.Orders
                .Where(o => o.Status == OrderStatus.Open)
                .AsEnumerable()
                .Select(o =>
                {
                    var currentPrice = stocks.TryGetValue(o.Ticker, out var s) ? s.Price : o.EntryPrice;
                    var currentValue = Math.Round(o.Shares * currentPrice, 2);
                    var unrealizedPnl = o.Type == OrderType.Long
                        ? currentValue - o.Amount
                        : o.Amount - currentValue;
                    var unrealizedPnlPct = o.Amount != 0
                        ? Math.Round(unrealizedPnl / o.Amount * 100m, 2)
                        : 0m;

                    return new PositionDto(
                        o.Id,
                        o.Ticker,
                        o.Type.ToString().ToLowerInvariant(),
                        o.Amount,
                        o.Shares,
                        o.EntryPrice,
                        currentPrice,
                        currentValue,
                        unrealizedPnl,
                        unrealizedPnlPct);
                })
                .ToList();

            return Results.Ok(new { positions });
        }).RequireAuthorization();

        // ── POST /api/v1/positions/{orderId}/close ────────────────────────────
        app.MapPost("/api/v1/positions/{orderId:guid}/close", async (
            Guid orderId,
            AppDbContext db,
            IMarketDataService market,
            ICurrentUserService currentUser) =>
        {
            // Bypass Global Query Filter to detect ownership vs. non-existence
            var order = await db.Orders
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order is null)
            {
                return Results.Json(
                    new { error = "Position not found.", orderId },
                    statusCode: 404);
            }

            // Owner check — return 403 if the order belongs to a different user
            if (order.UserId != currentUser.UserId)
            {
                return Results.Json(
                    new { error = "Access denied.", orderId },
                    statusCode: 403);
            }

            if (order.Status != OrderStatus.Open)
            {
                return Results.Json(
                    new { error = "Position already closed.", orderId },
                    statusCode: 404);
            }

            var stocks = (await market.GetAllStocksAsync()).ToList();
            var stock = stocks.FirstOrDefault(
                s => s.Ticker.Equals(order.Ticker, StringComparison.OrdinalIgnoreCase));

            var closingPrice = stock?.Price ?? order.EntryPrice;
            var currentValue = Math.Round(order.Shares * closingPrice, 2);
            var realizedPnl = order.Type == OrderType.Long
                ? currentValue - order.Amount
                : order.Amount - currentValue;

            // Credit wallet — Global Query Filter scopes to current user's wallet
            var wallet = await db.Wallets.FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Wallet not found.");
            wallet.Balance += currentValue;
            wallet.UpdatedAt = DateTimeOffset.UtcNow;

            // Close order
            order.Status = OrderStatus.Closed;
            order.ClosedAt = DateTimeOffset.UtcNow;

            // Update transaction record — bypassing filter since we know the OrderId
            var transaction = await db.Transactions
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.OrderId == order.Id);
            if (transaction is not null)
            {
                transaction.Status = TransactionStatus.Closed;
                transaction.RealizedPnl = Math.Round(realizedPnl, 2);
                transaction.ClosingPrice = closingPrice;
                transaction.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await db.SaveChangesAsync();

            return Results.Ok(new ClosePositionResponse(
                order.Id,
                order.Ticker,
                order.Type.ToString().ToLowerInvariant(),
                closingPrice,
                Math.Round(realizedPnl, 2),
                wallet.Balance,
                order.ClosedAt!.Value));
        }).RequireAuthorization();

        return app;
    }
}
