namespace ReadyWealth.Api.Domain;

public class Wallet
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public decimal Balance { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>FK → User.Id. Scopes this wallet to its owner.</summary>
    public string UserId { get; set; } = string.Empty;
}
