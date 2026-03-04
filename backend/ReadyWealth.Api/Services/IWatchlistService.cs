using ReadyWealth.Api.Dtos;

namespace ReadyWealth.Api.Services;

public interface IWatchlistService
{
    Task<IEnumerable<WatchlistItemDto>> GetAllAsync();
    Task<WatchlistItemDto> AddAsync(string ticker, bool isAutoAdded);
    Task RemoveAsync(string ticker);
}
