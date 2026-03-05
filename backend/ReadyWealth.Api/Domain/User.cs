namespace ReadyWealth.Api.Domain;

/// <summary>Represents an authenticated Sprout employee who has logged into ReadyWealth.</summary>
public class User
{
    /// <summary>Sprout EmployeeId (int stored as string). Stable, globally unique per employee.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Sprout tenant domain used at login.</summary>
    public string DomainName { get; set; } = string.Empty;

    /// <summary>Sprout login username from SessionDataClaim.</summary>
    public string Username { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;
    public string LastName  { get; set; } = string.Empty;

    /// <summary>Sprout multi-tenant client ID.</summary>
    public int ClientId { get; set; }

    /// <summary>UTC timestamp of first login. Set once; never updated.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>UTC timestamp of most recent successful login.</summary>
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
}
