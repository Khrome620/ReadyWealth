namespace ReadyWealth.Api.Domain;

public class WatchlistEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Ticker { get; set; } = string.Empty;
    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsAutoAdded { get; set; }
}
