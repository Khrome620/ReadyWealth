using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Api.Endpoints;

public static class WalletEndpoints
{
    public static void MapWalletEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/wallet", async (AppDbContext db) =>
        {
            var wallet = await db.Wallets.FirstOrDefaultAsync();
            if (wallet is null)
                return Results.Problem("Wallet not found.", statusCode: 500);

            return Results.Ok(new
            {
                id        = wallet.Id,
                balance   = wallet.Balance,
                updatedAt = wallet.UpdatedAt,
            });
        }).RequireAuthorization();

        app.MapPost("/api/v1/wallet/deposit", async (DepositRequest req, AppDbContext db) =>
        {
            if (req.Amount <= 0)
                return Results.BadRequest(new { error = "Amount must be greater than zero." });

            var wallet = await db.Wallets.FirstOrDefaultAsync();
            if (wallet is null)
                return Results.Problem("Wallet not found.", statusCode: 500);

            wallet.Balance   += req.Amount;
            wallet.UpdatedAt  = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(new { balance = wallet.Balance, updatedAt = wallet.UpdatedAt });
        }).RequireAuthorization();
    }
}

internal record DepositRequest(decimal Amount);
