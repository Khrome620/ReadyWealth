using ReadyWealth.Api.Dtos;

namespace ReadyWealth.Api.Services;

public class RecommendationService(IMarketDataService market) : IRecommendationService
{
    public async Task<IEnumerable<RecommendationDto>> GetRecommendationsAsync()
    {
        var stocks = (await market.GetAllStocksAsync()).ToList();

        // Rule 1: Top 3 by positive changePct → "Strong upward momentum"
        var topMovers = stocks
            .Where(s => s.ChangePct > 0)
            .OrderByDescending(s => s.ChangePct)
            .Take(3)
            .Select(s => new RecommendationDto(
                s.Ticker, s.Name, s.Price,
                "Strong upward momentum",
                s.ChangePct > 3m ? "high" : s.ChangePct >= 1m ? "medium" : "low"))
            .ToList();

        // Rule 2: Top 2 by volume, not already in topMovers → "High trading activity"
        var topMoverTickers = topMovers.Select(r => r.Ticker).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var topVolume = stocks
            .Where(s => !topMoverTickers.Contains(s.Ticker))
            .OrderByDescending(s => s.Volume)
            .Take(2)
            .Select(s => new RecommendationDto(
                s.Ticker, s.Name, s.Price,
                "High trading activity",
                "medium"))
            .ToList();

        return topMovers.Concat(topVolume).Take(5);
    }
}
