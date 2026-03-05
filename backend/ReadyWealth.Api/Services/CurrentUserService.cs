using System.Security.Claims;
using System.Text.Json;

namespace ReadyWealth.Api.Services;

/// <summary>
/// Reads the authenticated user's EmployeeId from the Sprout JWT SessionDataClaim.
/// Registered as Scoped — one instance per HTTP request.
/// </summary>
public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public string UserId
    {
        get
        {
            var context = httpContextAccessor.HttpContext;
            if (context?.User?.Identity?.IsAuthenticated != true)
                return string.Empty;

            // The Sprout JWT embeds user data as a JSON string in the "SessionDataClaim" claim.
            var sessionDataJson = context.User.FindFirstValue("SessionDataClaim");
            if (string.IsNullOrWhiteSpace(sessionDataJson))
                return string.Empty;

            try
            {
                using var doc = JsonDocument.Parse(sessionDataJson);
                if (doc.RootElement.TryGetProperty("EmployeeId", out var empId))
                    return empId.GetInt32().ToString();
            }
            catch (JsonException)
            {
                // Malformed claim — treat as unauthenticated
            }

            return string.Empty;
        }
    }
}
