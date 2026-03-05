namespace ReadyWealth.Api.Services;

/// <summary>Provides the authenticated user's identity for the current HTTP request.</summary>
public interface ICurrentUserService
{
    /// <summary>
    /// Sprout EmployeeId (as string) of the authenticated user.
    /// Returns an empty string when the request is unauthenticated.
    /// </summary>
    string UserId { get; }
}
