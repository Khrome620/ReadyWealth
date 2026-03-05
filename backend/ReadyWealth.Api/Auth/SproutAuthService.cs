using Microsoft.Data.SqlClient;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;

namespace ReadyWealth.Api.Auth;

/// <summary>
/// Authenticates users against the Sprout HR Auth IdentityServer4 endpoint
/// using the Resource Owner Password grant.
/// Each Sprout HR client has a unique AppId (HMACAppID) and Secret stored in HRISMaster.
/// We look these up by domain name before issuing the ROPC request.
/// </summary>
public class SproutAuthService(IHttpClientFactory httpClientFactory, IConfiguration configuration) : ISproutAuthService
{
    public async Task<SproutTokenResult?> AuthenticateAsync(string domain, string username, string password)
    {
        var baseUrl = configuration["SproutAuth:BaseUrl"]
            ?? throw new InvalidOperationException("SproutAuth:BaseUrl is not configured.");

        // Look up per-domain client credentials from HRISMaster
        var (clientId, clientSecret) = await GetClientCredentialsForDomainAsync(domain);

        using var client = httpClientFactory.CreateClient("SproutAuth");

        var form = new Dictionary<string, string>
        {
            ["grant_type"]    = "password",
            ["client_id"]     = clientId,
            ["client_secret"] = clientSecret,
            ["username"]      = username,
            ["password"]      = password,
        };

        // HttpRequestException propagates to caller → mapped to 503
        var response = await client.PostAsync(baseUrl, new FormUrlEncodedContent(form));

        if (!response.IsSuccessStatusCode)
            return null; // Invalid credentials → caller returns 401

        var responseBody = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(responseBody);
        if (!doc.RootElement.TryGetProperty("access_token", out var tokenProp))
            return null;

        var accessToken = tokenProp.GetString() ?? string.Empty;
        var claims = ParseClaims(accessToken);

        return new SproutTokenResult(
            AccessToken: accessToken,
            EmployeeId:  claims.EmployeeId,
            Username:    claims.Username,
            FirstName:   claims.FirstName,
            LastName:    claims.LastName,
            ClientId:    claims.ClientId,
            DomainName:  domain
        );
    }

    /// <summary>
    /// Queries HRISMaster to get the OAuth2 AppId (HMACAppID) and Secret for the given domain.
    /// Each Sprout HR client is registered with their own client credentials.
    /// </summary>
    private async Task<(string ClientId, string ClientSecret)> GetClientCredentialsForDomainAsync(string domain)
    {
        var masterConnectionString = configuration["SproutAuth:MasterConnectionString"]
            ?? throw new InvalidOperationException("SproutAuth:MasterConnectionString is not configured.");

        await using var db = new SqlConnection(masterConnectionString);
        await db.OpenAsync();

        const string sql = """
            SELECT TOP 1
                c.HMACAppID   AS AppId,
                cs.Secret     AS Secret
            FROM Client c
            JOIN ClientSecret cs ON cs.ClientID = c.ClientID
            WHERE c.DomainName = @domain
              AND cs.IsDeleted  = 0
            """;

        await using var cmd = new SqlCommand(sql, db);
        cmd.Parameters.AddWithValue("@domain", domain);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            throw new InvalidOperationException($"Domain '{domain}' not found in HRISMaster.");

        var appId  = reader.GetString(reader.GetOrdinal("AppId"));
        var secret = reader.GetString(reader.GetOrdinal("Secret"));

        return (appId, secret);
    }

    private static (string EmployeeId, string Username, string FirstName, string LastName, int ClientId) ParseClaims(string jwt)
    {
        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(jwt))
            return (string.Empty, string.Empty, string.Empty, string.Empty, 0);

        var token = handler.ReadJwtToken(jwt);
        var sessionDataJson = token.Claims.FirstOrDefault(c => c.Type == "SessionDataClaim")?.Value ?? "{}";

        try
        {
            using var doc = JsonDocument.Parse(sessionDataJson);
            var root = doc.RootElement;

            return (
                EmployeeId: root.TryGetProperty("EmployeeId", out var eid) ? eid.GetInt32().ToString() : string.Empty,
                Username:   root.TryGetProperty("Username",   out var un)  ? un.GetString() ?? string.Empty  : string.Empty,
                FirstName:  root.TryGetProperty("FirstName",  out var fn)  ? fn.GetString() ?? string.Empty  : string.Empty,
                LastName:   root.TryGetProperty("LastName",   out var ln)  ? ln.GetString() ?? string.Empty  : string.Empty,
                ClientId:   root.TryGetProperty("ClientId",   out var cid) ? cid.GetInt32() : 0
            );
        }
        catch (JsonException)
        {
            return (string.Empty, string.Empty, string.Empty, string.Empty, 0);
        }
    }
}
