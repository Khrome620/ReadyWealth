using ReadyWealth.Api.Dtos;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Api.Endpoints;

public static class TransactionEndpoints
{
    public static IEndpointRouteBuilder MapTransactionEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/transactions", (AppDbContext db) =>
        {
            // Global Query Filter automatically scopes to the authenticated user's transactions
            // AsEnumerable() pulls to client side so DateTimeOffset ordering works in SQLite
            var transactions = db.Transactions
                .AsEnumerable()
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TransactionDto(
                    t.Id,
                    t.OrderId,
                    t.Ticker,
                    t.Type.ToString().ToLowerInvariant(),
                    t.Amount,
                    t.Status.ToString().ToLowerInvariant(),
                    t.RealizedPnl,
                    t.ClosingPrice,
                    t.CreatedAt,
                    t.UpdatedAt))
                .ToList();

            return Results.Ok(new { transactions });
        }).RequireAuthorization();

        return app;
    }
}
