using ReadyWealth.Api.Services;

namespace ReadyWealth.Tests.TestHelpers;

/// <summary>
/// A test double for ICurrentUserService that returns a configurable fixed UserId.
/// Use in unit tests and integration test factories.
/// </summary>
public class FakeCurrentUserService(string userId = FakeCurrentUserService.DefaultUserId) : ICurrentUserService
{
    public const string DefaultUserId = "test-user-1";
    public string UserId { get; } = userId;
}
