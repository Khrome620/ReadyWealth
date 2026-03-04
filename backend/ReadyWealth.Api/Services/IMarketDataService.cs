using ReadyWealth.Api.Domain;

namespace ReadyWealth.Api.Services;

public interface IMarketDataService
{
    Task<IEnumerable<Stock>> GetAllStocksAsync();
    Task<bool> GetMarketStatusAsync();
    Task<DateTimeOffset> GetLastUpdatedAsync();
    Task<IEnumerable<Stock>> GetGainersAsync();
    Task<IEnumerable<Stock>> GetLosersAsync();
    Task<IEnumerable<Stock>> GetMostActiveAsync();
}
