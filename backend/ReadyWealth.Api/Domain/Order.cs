namespace ReadyWealth.Api.Domain;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Ticker { get; set; } = string.Empty;
    public OrderType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal Shares { get; set; }
    public decimal EntryPrice { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Open;
    public string? IdempotencyKey { get; set; }
    public DateTimeOffset PlacedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }
}
