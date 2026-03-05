using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Persistence;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Tests.TestHelpers;

/// <summary>
/// Integration test factory that:
///   1. Uses in-memory SQLite so tests never touch the dev database.
///   2. Seeds a test User + Wallet so protected endpoints work out of the box.
///   3. Registers FakeCurrentUserService so Global Query Filters resolve to the test user.
///
/// Usage:
///   public class MyTests : IClassFixture&lt;AuthenticatedTestFactory&gt; { … }
/// </summary>
public sealed class AuthenticatedTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string TestUserId   = "test-user-1";
    public const decimal StartingBalance = 300_000m;

    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();

        // Seed initial DB state using the same connection the app will use
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        var fakeUser = new FakeCurrentUserService(TestUserId);
        await using var seed = new AppDbContext(options, fakeUser);
        await seed.Database.EnsureCreatedAsync();

        seed.Users.Add(new User
        {
            Id          = TestUserId,
            DomainName  = "test",
            Username    = "testuser",
            FirstName   = "Test",
            LastName    = "User",
            ClientId    = 1,
            CreatedAt   = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow,
        });
        seed.Wallets.Add(new Wallet
        {
            Id        = Guid.NewGuid(),
            UserId    = TestUserId,
            Balance   = StartingBalance,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await seed.SaveChangesAsync();
    }

    public new async Task DisposeAsync()
    {
        await _connection.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            // Replace real DbContext with in-memory SQLite on the same connection
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbDescriptor != null) services.Remove(dbDescriptor);
            services.AddDbContext<AppDbContext>(o => o.UseSqlite(_connection));

            // Replace real ICurrentUserService with fake authenticated user
            var currentUserDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ICurrentUserService));
            if (currentUserDescriptor != null) services.Remove(currentUserDescriptor);
            services.AddScoped<ICurrentUserService>(_ => new FakeCurrentUserService(TestUserId));

            // Replace JWT bearer auth with a test handler that auto-authenticates every request
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }
}
