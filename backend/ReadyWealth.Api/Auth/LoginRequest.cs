using System.ComponentModel.DataAnnotations;

namespace ReadyWealth.Api.Auth;

/// <summary>Payload for POST /api/v1/auth/login.</summary>
public record LoginRequest(
    [Required] string Domain,
    [Required] string Username,
    [Required] string Password
);
