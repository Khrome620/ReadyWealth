using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using NSubstitute;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Tests.Unit.Auth;

/// <summary>
/// Unit tests for CurrentUserService.
/// Validates that UserId is correctly extracted from the Sprout JWT SessionDataClaim,
/// and returns an empty string for unauthenticated or malformed scenarios.
/// </summary>
public class CurrentUserServiceTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private static IHttpContextAccessor BuildAccessor(ClaimsPrincipal? principal = null, bool isAuthenticated = true)
    {
        var identity = new ClaimsIdentity(
            principal?.Claims ?? [],
            isAuthenticated ? "Bearer" : string.Empty);

        var user = new ClaimsPrincipal(identity);
        var httpContext = Substitute.For<HttpContext>();
        httpContext.User.Returns(user);

        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);
        return accessor;
    }

    private static string BuildSessionDataClaim(int employeeId, string username = "jdoe") =>
        JsonSerializer.Serialize(new
        {
            EmployeeId = employeeId,
            Username   = username,
            FirstName  = "John",
            LastName   = "Doe",
            ClientId   = 1,
        });

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public void UserId_AuthenticatedWithValidSessionDataClaim_ReturnsEmployeeId()
    {
        var sessionData = BuildSessionDataClaim(42);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim("SessionDataClaim", sessionData),
        ], "Bearer"));

        var accessor = BuildAccessor(principal);
        var svc = new CurrentUserService(accessor);

        Assert.Equal("42", svc.UserId);
    }

    [Fact]
    public void UserId_NoHttpContext_ReturnsEmpty()
    {
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns((HttpContext?)null);
        var svc = new CurrentUserService(accessor);

        Assert.Equal(string.Empty, svc.UserId);
    }

    [Fact]
    public void UserId_UnauthenticatedUser_ReturnsEmpty()
    {
        var accessor = BuildAccessor(isAuthenticated: false);
        var svc = new CurrentUserService(accessor);

        Assert.Equal(string.Empty, svc.UserId);
    }

    [Fact]
    public void UserId_MissingSessionDataClaim_ReturnsEmpty()
    {
        // Authenticated but no SessionDataClaim
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, "jdoe"),
        ], "Bearer"));

        var accessor = BuildAccessor(principal);
        var svc = new CurrentUserService(accessor);

        Assert.Equal(string.Empty, svc.UserId);
    }

    [Fact]
    public void UserId_MalformedSessionDataClaim_ReturnsEmpty()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim("SessionDataClaim", "not-valid-json{{{"),
        ], "Bearer"));

        var accessor = BuildAccessor(principal);
        var svc = new CurrentUserService(accessor);

        Assert.Equal(string.Empty, svc.UserId);
    }

    [Fact]
    public void UserId_SessionDataClaimMissingEmployeeId_ReturnsEmpty()
    {
        var sessionData = JsonSerializer.Serialize(new
        {
            Username  = "jdoe",
            FirstName = "John",
            // EmployeeId intentionally omitted
        });
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim("SessionDataClaim", sessionData),
        ], "Bearer"));

        var accessor = BuildAccessor(principal);
        var svc = new CurrentUserService(accessor);

        Assert.Equal(string.Empty, svc.UserId);
    }
}
