using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using ReadyWealth.Api.Auth;

namespace ReadyWealth.Tests.Unit.Auth;

/// <summary>
/// Unit tests for SproutAuthService.
/// The real HTTP calls are replaced by a fake IHttpClientFactory + DelegatingHandler.
/// </summary>
public class SproutAuthServiceTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private static IConfiguration BuildConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SproutAuth:BaseUrl"]      = "https://fake-sprout.example.com/connect/token",
                ["SproutAuth:ClientId"]     = "ro.client",
                ["SproutAuth:ClientSecret"] = "secret",
            })
            .Build();

    /// <summary>
    /// Creates a minimal valid JWT string carrying a SessionDataClaim.
    /// The token is not cryptographically signed — SproutAuthService only
    /// reads it with JwtSecurityTokenHandler.ReadJwtToken (no validation).
    /// </summary>
    private static string BuildJwt(int employeeId, string username, string firstName, string lastName, int clientId)
    {
        var sessionData = JsonSerializer.Serialize(new
        {
            EmployeeId = employeeId,
            Username   = username,
            FirstName  = firstName,
            LastName   = lastName,
            ClientId   = clientId,
        });

        static string B64(string s) =>
            Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(s))
                   .TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var header  = B64("""{"alg":"HS256","typ":"JWT"}""");
        var payload = B64(JsonSerializer.Serialize(new
        {
            sub              = employeeId.ToString(),
            SessionDataClaim = sessionData,
            exp              = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds(),
        }));
        return $"{header}.{payload}.fakesig";
    }

    private static IHttpClientFactory BuildFactory(HttpResponseMessage responseMessage)
    {
        var handler = new StubHttpMessageHandler(responseMessage);
        var client  = new HttpClient(handler);
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient(Arg.Any<string>()).Returns(client);
        return factory;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AuthenticateAsync_SuccessResponse_ReturnsSproutTokenResult()
    {
        var jwt = BuildJwt(42, "jdoe", "John", "Doe", 7);
        var responseBody = JsonSerializer.Serialize(new { access_token = jwt });
        var factory = BuildFactory(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(responseBody, System.Text.Encoding.UTF8, "application/json"),
        });

        var svc = new SproutAuthService(factory, BuildConfig());

        var result = await svc.AuthenticateAsync("testdomain", "jdoe", "password");

        Assert.NotNull(result);
        Assert.Equal("42", result!.EmployeeId);
        Assert.Equal("jdoe", result.Username);
        Assert.Equal("John", result.FirstName);
        Assert.Equal("Doe", result.LastName);
        Assert.Equal(7, result.ClientId);
        Assert.Equal("testdomain", result.DomainName);
        Assert.Equal(jwt, result.AccessToken);
    }

    [Fact]
    public async Task AuthenticateAsync_UnauthorizedResponse_ReturnsNull()
    {
        var factory = BuildFactory(new HttpResponseMessage(HttpStatusCode.Unauthorized)
        {
            Content = new StringContent("""{"error":"invalid_grant"}"""),
        });
        var svc = new SproutAuthService(factory, BuildConfig());

        var result = await svc.AuthenticateAsync("d", "u", "wrong");

        Assert.Null(result);
    }

    [Fact]
    public async Task AuthenticateAsync_400Response_ReturnsNull()
    {
        var factory = BuildFactory(new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("""{"error":"bad_request"}"""),
        });
        var svc = new SproutAuthService(factory, BuildConfig());

        var result = await svc.AuthenticateAsync("d", "u", "p");

        Assert.Null(result);
    }

    [Fact]
    public async Task AuthenticateAsync_NetworkError_ThrowsHttpRequestException()
    {
        var handler = new ThrowingHttpMessageHandler();
        var client  = new HttpClient(handler);
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient(Arg.Any<string>()).Returns(client);
        var svc = new SproutAuthService(factory, BuildConfig());

        await Assert.ThrowsAsync<HttpRequestException>(
            () => svc.AuthenticateAsync("d", "u", "p"));
    }

    [Fact]
    public async Task AuthenticateAsync_NoAccessTokenInResponse_ReturnsNull()
    {
        var factory = BuildFactory(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"token_type":"bearer"}""", System.Text.Encoding.UTF8, "application/json"),
        });
        var svc = new SproutAuthService(factory, BuildConfig());

        var result = await svc.AuthenticateAsync("d", "u", "p");

        Assert.Null(result);
    }

    // ── Stubs ─────────────────────────────────────────────────────────────────

    private sealed class StubHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(response);
    }

    private sealed class ThrowingHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
            => throw new HttpRequestException("Connection refused");
    }
}
