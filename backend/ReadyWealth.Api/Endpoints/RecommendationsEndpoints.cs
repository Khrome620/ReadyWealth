using ReadyWealth.Api.Services;

namespace ReadyWealth.Api.Endpoints;

public static class RecommendationsEndpoints
{
    public static IEndpointRouteBuilder MapRecommendationsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/recommendations", async (IRecommendationService svc) =>
        {
            var recs = (await svc.GetRecommendationsAsync()).ToList();

            if (recs.Count < 3)
            {
                return Results.Json(
                    new
                    {
                        error = "Recommendations unavailable — insufficient market data.",
                        retryAfter = DateTimeOffset.UtcNow.AddMinutes(15),
                    },
                    statusCode: 503);
            }

            return Results.Ok(new
            {
                recommendations = recs,
                generatedAt = DateTimeOffset.UtcNow,
                disclaimer = "Not financial advice — for informational purposes only.",
            });
        });

        return app;
    }
}
