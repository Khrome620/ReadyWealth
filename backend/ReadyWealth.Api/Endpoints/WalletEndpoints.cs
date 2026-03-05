using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Api.Endpoints;

public static class WalletEndpoints
{
    public static void MapWalletEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/wallet", async (AppDbContext db) =>
        {
            // Global Query Filter automatically scopes to the authenticated user's wallet
            var wallet = await db.Wallets.FirstOrDefaultAsync();
            if (wallet is null)
                return Results.Problem("Wallet not found.", statusCode: 500);

            return Results.Ok(new
            {
                id = wallet.Id,
                balance = wallet.Balance,
                updatedAt = wallet.UpdatedAt,
            });
        }).RequireAuthorization();
    }
}
