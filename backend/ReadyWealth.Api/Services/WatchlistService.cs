using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Dtos;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Api.Services;

public class WatchlistService(AppDbContext db, IMarketDataService market) : IWatchlistService
{
    public async Task<IEnumerable<WatchlistItemDto>> GetAllAsync()
    {
        var stocks = (await market.GetAllStocksAsync())
            .ToDictionary(s => s.Ticker, StringComparer.OrdinalIgnoreCase);

        return db.WatchlistEntries
            .AsEnumerable()
            .Select(e =>
            {
                stocks.TryGetValue(e.Ticker, out var stock);
                return new WatchlistItemDto(
                    e.Ticker,
                    stock?.Name ?? e.Ticker,
                    stock?.Price ?? 0m,
                    stock?.Change ?? 0m,
                    stock?.ChangePct ?? 0m,
                    stock?.Volume ?? 0L,
                    e.IsAutoAdded,
                    e.AddedAt);
            })
            .ToList();
    }

    public async Task<WatchlistItemDto> AddAsync(string ticker, bool isAutoAdded)
    {
        // Validate ticker exists
        var stocks = (await market.GetAllStocksAsync()).ToList();
        var stock = stocks.FirstOrDefault(
            s => s.Ticker.Equals(ticker, StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException($"Unknown ticker: {ticker}");

        // Check duplicate
        var existing = db.WatchlistEntries.AsEnumerable()
            .FirstOrDefault(e => e.Ticker.Equals(ticker, StringComparison.OrdinalIgnoreCase));
        if (existing is not null)
            throw new InvalidOperationException($"Ticker '{ticker}' is already in the watchlist.");

        var entry = new WatchlistEntry
        {
            Id = Guid.NewGuid(),
            Ticker = stock.Ticker,
            AddedAt = DateTimeOffset.UtcNow,
            IsAutoAdded = isAutoAdded,
        };
        db.WatchlistEntries.Add(entry);
        await db.SaveChangesAsync();

        return new WatchlistItemDto(
            entry.Ticker, stock.Name, stock.Price, stock.Change, stock.ChangePct,
            stock.Volume, entry.IsAutoAdded, entry.AddedAt);
    }

    public async Task RemoveAsync(string ticker)
    {
        var entry = db.WatchlistEntries.AsEnumerable()
            .FirstOrDefault(e => e.Ticker.Equals(ticker, StringComparison.OrdinalIgnoreCase))
            ?? throw new KeyNotFoundException($"Ticker '{ticker}' is not in the watchlist.");

        db.WatchlistEntries.Remove(entry);
        await db.SaveChangesAsync();
    }
}
