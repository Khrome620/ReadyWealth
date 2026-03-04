using ReadyWealth.Api.Services;

namespace ReadyWealth.Api.Endpoints;

public static class WatchlistEndpoints
{
    public static IEndpointRouteBuilder MapWatchlistEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /api/v1/watchlist
        app.MapGet("/api/v1/watchlist", async (IWatchlistService svc) =>
        {
            var items = await svc.GetAllAsync();
            return Results.Ok(new { watchlist = items });
        });

        // POST /api/v1/watchlist
        app.MapPost("/api/v1/watchlist", async (
            AddToWatchlistRequest request,
            IWatchlistService svc) =>
        {
            try
            {
                var item = await svc.AddAsync(request.Ticker, isAutoAdded: false);
                return Results.Created($"/api/v1/watchlist/{item.Ticker}", new
                {
                    ticker = item.Ticker,
                    isAutoAdded = item.IsAutoAdded,
                    addedAt = item.AddedAt,
                });
            }
            catch (ArgumentException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 400);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 409);
            }
        });

        // DELETE /api/v1/watchlist/{ticker}
        app.MapDelete("/api/v1/watchlist/{ticker}", async (string ticker, IWatchlistService svc) =>
        {
            try
            {
                await svc.RemoveAsync(ticker);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 404);
            }
        });

        return app;
    }
}

public record AddToWatchlistRequest(string Ticker);
