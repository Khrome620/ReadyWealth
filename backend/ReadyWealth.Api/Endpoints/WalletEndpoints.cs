using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Api.Endpoints;

public static class WalletEndpoints
{
    public static void MapWalletEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/wallet", async (AppDbContext db) =>
        {
            var wallet = await db.Wallets.FindAsync(AppDbContext.SeedWalletId);
            if (wallet is null)
                return Results.Problem("Wallet not found.", statusCode: 500);

            return Results.Ok(new
            {
                id = wallet.Id,
                balance = wallet.Balance,
                updatedAt = wallet.UpdatedAt,
            });
        });
    }
}
