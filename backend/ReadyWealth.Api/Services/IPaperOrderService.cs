using ReadyWealth.Api.Dtos;

namespace ReadyWealth.Api.Services;

public interface IPaperOrderService
{
    Task<PlaceOrderResponse> PlaceOrderAsync(PlaceOrderRequest request);
    Task<IEnumerable<OrderDto>> GetOrdersAsync();
    Task<ClosePositionResponse> ClosePositionAsync(Guid orderId);
}
