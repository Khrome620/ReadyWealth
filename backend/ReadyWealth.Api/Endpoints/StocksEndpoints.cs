using Microsoft.AspNetCore.Authorization;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Api.Endpoints;

public static class StocksEndpoints
{
    public static void MapStocksEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/stocks", async (IMarketDataService svc) =>
        {
            var stocks = await svc.GetAllStocksAsync();
            var marketOpen = await svc.GetMarketStatusAsync();
            var lastUpdated = await svc.GetLastUpdatedAsync();
            return Results.Ok(new { stocks, marketOpen, lastUpdated });
        }).AllowAnonymous();

        app.MapGet("/api/v1/stocks/gainers", async (IMarketDataService svc) =>
        {
            var stocks = await svc.GetGainersAsync();
            var marketOpen = await svc.GetMarketStatusAsync();
            var lastUpdated = await svc.GetLastUpdatedAsync();
            return Results.Ok(new { stocks, marketOpen, lastUpdated });
        }).AllowAnonymous();

        app.MapGet("/api/v1/stocks/losers", async (IMarketDataService svc) =>
        {
            var stocks = await svc.GetLosersAsync();
            var marketOpen = await svc.GetMarketStatusAsync();
            var lastUpdated = await svc.GetLastUpdatedAsync();
            return Results.Ok(new { stocks, marketOpen, lastUpdated });
        }).AllowAnonymous();

        app.MapGet("/api/v1/stocks/active", async (IMarketDataService svc) =>
        {
            var stocks = await svc.GetMostActiveAsync();
            var marketOpen = await svc.GetMarketStatusAsync();
            var lastUpdated = await svc.GetLastUpdatedAsync();
            return Results.Ok(new { stocks, marketOpen, lastUpdated });
        }).AllowAnonymous();
    }
}
