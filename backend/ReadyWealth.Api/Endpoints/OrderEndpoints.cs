using ReadyWealth.Api.Dtos;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Api.Endpoints;

public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this WebApplication app)
    {
        app.MapPost("/api/v1/orders", async (PlaceOrderRequest request, IPaperOrderService svc) =>
        {
            try
            {
                var result = await svc.PlaceOrderAsync(request);
                return Results.Created($"/api/v1/orders/{result.OrderId}", result);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // 409 for duplicate / insufficient-funds variants
                var status = ex.Message.Contains("Insufficient") ? 400 : 409;
                return Results.Json(new { error = ex.Message }, statusCode: status);
            }
        }).RequireAuthorization();

        app.MapGet("/api/v1/orders", async (IPaperOrderService svc) =>
        {
            var orders = await svc.GetOrdersAsync();
            return Results.Ok(orders);
        }).RequireAuthorization();
    }
}
