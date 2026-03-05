namespace ReadyWealth.Api.Auth;

/// <summary>Result returned after a successful Sprout HR Auth token exchange.</summary>
public record SproutTokenResult(
    string AccessToken,
    string EmployeeId,
    string Username,
    string FirstName,
    string LastName,
    int    ClientId,
    string DomainName
);

/// <summary>Proxies credential validation to the Sprout HR Auth IdentityServer4 endpoint.</summary>
public interface ISproutAuthService
{
    /// <summary>
    /// Authenticates the user against Sprout HR Auth using the Resource Owner Password grant.
    /// </summary>
    /// <returns>Token result on success; null on invalid credentials (401).</returns>
    /// <exception cref="HttpRequestException">Thrown when the Sprout auth service is unreachable (causes 503).</exception>
    Task<SproutTokenResult?> AuthenticateAsync(string domain, string username, string password);
}
