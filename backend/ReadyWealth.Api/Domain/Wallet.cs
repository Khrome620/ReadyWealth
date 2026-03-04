namespace ReadyWealth.Api.Domain;

public class Wallet
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public decimal Balance { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
