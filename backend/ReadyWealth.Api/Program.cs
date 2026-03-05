using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ReadyWealth.Api.Auth;
using ReadyWealth.Api.Endpoints;
using ReadyWealth.Api.Persistence;
using ReadyWealth.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── HTTP Context (needed by ICurrentUserService) ──────────────────────────────
builder.Services.AddHttpContextAccessor();

// ── Auth — JWT Bearer, reads token from rw_auth HttpOnly cookie ───────────────
var jwtSecret = builder.Configuration["AppSettings:Secret"] ?? string.Empty;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = false,
            ValidateAudience         = false,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };

        // Extract JWT from the HttpOnly cookie instead of the Authorization header
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue(
                    ctx.HttpContext.RequestServices
                        .GetRequiredService<IConfiguration>()["Cookie:Name"] ?? "rw_auth",
                    out var token))
                {
                    ctx.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

// ── Sprout Auth proxy ─────────────────────────────────────────────────────────
builder.Services.AddHttpClient("SproutAuth");
builder.Services.AddScoped<ISproutAuthService, SproutAuthService>();

// ── Current-user identity (scoped = per-request) ──────────────────────────────
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// ── Persistence ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=readywealth.db")
        // Query filters reference a scoped ICurrentUserService whose runtime expression
        // differs from the snapshot snapshot. Suppress the false-positive warning.
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// ── Domain Services ───────────────────────────────────────────────────────────
builder.Services.AddSingleton<IMarketDataService, MockMarketDataService>();
builder.Services.AddScoped<IPaperOrderService, PaperOrderService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IWatchlistService, WatchlistService>();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.SetIsOriginAllowed(origin =>
                Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                uri.Host == "localhost" &&
                uri.Port >= 5173 && uri.Port <= 5200)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "ReadyWealth API", Version = "v1" });
});

var app = builder.Build();

// ── Middleware (order matters) ────────────────────────────────────────────────
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapAuthEndpoints();
app.MapStocksEndpoints();
app.MapWalletEndpoints();
app.MapOrderEndpoints();
app.MapRecommendationsEndpoints();
app.MapTransactionEndpoints();
app.MapPositionEndpoints();
app.MapWatchlistEndpoints();

// ── Ensure DB is created and migrations applied ───────────────────────────────
// Skip migration in "Testing" environment — the test factory uses EnsureCreated()
// which builds the schema directly from the current EF model.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();

// Required by WebApplicationFactory<Program> in integration tests
public partial class Program { }
