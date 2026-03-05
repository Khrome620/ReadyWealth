using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Persistence;

namespace ReadyWealth.Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth");

        // ── POST /api/v1/auth/login ───────────────────────────────────────────
        group.MapPost("/login", async (
            LoginRequest request,
            ISproutAuthService sproutAuth,
            AppDbContext db,
            IConfiguration config,
            HttpContext ctx) =>
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.Domain) ||
                string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest(new
                {
                    error = "validation_error",
                    errors = new { general = new[] { "Domain, username, and password are all required." } }
                });
            }

            // ── Dev bypass: check DevUsers config first ───────────────────────
            var devUsers = config.GetSection("DevUsers").Get<List<DevUserConfig>>() ?? [];
            var devMatch = devUsers.FirstOrDefault(u =>
                string.Equals(u.Domain,    request.Domain,   StringComparison.OrdinalIgnoreCase) &&
                string.Equals(u.Username,  request.Username, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(u.Password,  request.Password, StringComparison.Ordinal));

            SproutTokenResult? tokenResult;

            if (devMatch is not null)
            {
                // Generate a real signed JWT so protected endpoints accept the cookie
                var jwtSecret = config["AppSettings:Secret"] ?? string.Empty;
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
                var sessionData = JsonSerializer.Serialize(new
                {
                    EmployeeId = int.TryParse(devMatch.EmployeeId, out var eid) ? eid : 0,
                    Username   = devMatch.Username,
                    FirstName  = devMatch.FirstName,
                    LastName   = devMatch.LastName,
                    ClientId   = devMatch.ClientId,
                });
                var jwtToken = new JwtSecurityToken(
                    claims: [new Claim("SessionDataClaim", sessionData)],
                    expires: DateTime.UtcNow.AddHours(8),
                    signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
                var devAccessToken = new JwtSecurityTokenHandler().WriteToken(jwtToken);

                tokenResult = new SproutTokenResult(
                    AccessToken: devAccessToken,
                    EmployeeId:  devMatch.EmployeeId,
                    Username:    devMatch.Username,
                    FirstName:   devMatch.FirstName,
                    LastName:    devMatch.LastName,
                    ClientId:    devMatch.ClientId,
                    DomainName:  devMatch.Domain);
            }
            else
            {
                try
                {
                    tokenResult = await sproutAuth.AuthenticateAsync(
                        request.Domain, request.Username, request.Password);
                }
                catch (Exception)
                {
                    return Results.Json(
                        new { error = "auth_service_unavailable", message = "Authentication service is temporarily unavailable. Please try again shortly." },
                        statusCode: 503);
                }
            }

            if (tokenResult is null)
            {
                return Results.Json(
                    new { error = "invalid_credentials", message = "The username or password is incorrect." },
                    statusCode: 401);
            }

            // Upsert User and provision Wallet if first login — all in one transaction
            // IgnoreQueryFilters because at login time there is no authenticated UserId yet
            var existingUser = await db.Users.FindAsync(tokenResult.EmployeeId);
            if (existingUser is null)
            {
                var newUser = new User
                {
                    Id          = tokenResult.EmployeeId,
                    DomainName  = tokenResult.DomainName,
                    Username    = tokenResult.Username,
                    FirstName   = tokenResult.FirstName,
                    LastName    = tokenResult.LastName,
                    ClientId    = tokenResult.ClientId,
                    CreatedAt   = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow,
                };
                db.Users.Add(newUser);

                var initialBalance = config.GetValue<decimal>("ReadyWealth:InitialWalletBalance", 300_000m);
                db.Wallets.Add(new Wallet
                {
                    Id        = Guid.NewGuid(),
                    Balance   = initialBalance,
                    UpdatedAt = DateTimeOffset.UtcNow,
                    UserId    = tokenResult.EmployeeId,
                });
            }
            else
            {
                existingUser.LastLoginAt = DateTime.UtcNow;
                existingUser.DomainName  = tokenResult.DomainName;
            }

            await db.SaveChangesAsync();

            // Set HttpOnly cookie with the Sprout JWT
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure   = config.GetValue<bool>("Cookie:Secure", false),
                SameSite = SameSiteMode.Strict,
                MaxAge   = TimeSpan.FromSeconds(config.GetValue<int>("Cookie:MaxAge", 3600)),
                Path     = "/",
            };
            ctx.Response.Cookies.Append(
                config["Cookie:Name"] ?? "rw_auth",
                tokenResult.AccessToken,
                cookieOptions);

            return Results.Ok(new
            {
                user = new
                {
                    id        = tokenResult.EmployeeId,
                    username  = tokenResult.Username,
                    firstName = tokenResult.FirstName,
                    lastName  = tokenResult.LastName,
                    clientId  = tokenResult.ClientId,
                }
            });
        }).AllowAnonymous();

        // ── POST /api/v1/auth/logout ──────────────────────────────────────────
        group.MapPost("/logout", (IConfiguration config, HttpContext ctx) =>
        {
            ctx.Response.Cookies.Delete(config["Cookie:Name"] ?? "rw_auth");
            return Results.Ok(new { message = "Logged out successfully." });
        }).RequireAuthorization();

        // ── GET /api/v1/auth/me ───────────────────────────────────────────────
        group.MapGet("/me", (HttpContext ctx) =>
        {
            if (ctx.User?.Identity?.IsAuthenticated != true)
                return Results.Unauthorized();

            var sessionDataJson = ctx.User.FindFirstValue("SessionDataClaim") ?? "{}";
            try
            {
                using var doc = JsonDocument.Parse(sessionDataJson);
                var root = doc.RootElement;
                return Results.Ok(new
                {
                    user = new
                    {
                        id        = root.TryGetProperty("EmployeeId", out var eid)  ? eid.GetInt32().ToString() : string.Empty,
                        username  = root.TryGetProperty("Username",   out var un)   ? un.GetString()            : string.Empty,
                        firstName = root.TryGetProperty("FirstName",  out var fn)   ? fn.GetString()            : string.Empty,
                        lastName  = root.TryGetProperty("LastName",   out var ln)   ? ln.GetString()            : string.Empty,
                        clientId  = root.TryGetProperty("ClientId",   out var cid)  ? cid.GetInt32()            : 0,
                    }
                });
            }
            catch (JsonException)
            {
                return Results.Unauthorized();
            }
        }).RequireAuthorization();

        return app;
    }
}

/// <summary>Config record for dev-bypass accounts defined in appsettings.Development.json.</summary>
internal sealed class DevUserConfig
{
    public string Domain     { get; set; } = string.Empty;
    public string Username   { get; set; } = string.Empty;
    public string Password   { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string FirstName  { get; set; } = string.Empty;
    public string LastName   { get; set; } = string.Empty;
    public int    ClientId   { get; set; }
}
