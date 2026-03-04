using ReadyWealth.Api.Dtos;

namespace ReadyWealth.Api.Services;

public interface IRecommendationService
{
    Task<IEnumerable<RecommendationDto>> GetRecommendationsAsync();
}
