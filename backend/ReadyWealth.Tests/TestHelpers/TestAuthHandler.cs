using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ReadyWealth.Tests.TestHelpers;

/// <summary>
/// A fake authentication handler for integration tests.
/// Automatically authenticates every request as the test user,
/// injecting the SessionDataClaim that <see cref="FakeCurrentUserService"/> relies on.
/// </summary>
public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Inject the SessionDataClaim that CurrentUserService reads from
        var sessionData = JsonSerializer.Serialize(new
        {
            EmployeeId = int.TryParse(FakeCurrentUserService.DefaultUserId.Replace("test-user-", ""), out var id) ? id : 1,
            Username   = "testuser",
            FirstName  = "Test",
            LastName   = "User",
            ClientId   = 1,
        });

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim("SessionDataClaim", sessionData),
        };

        var identity  = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket    = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
