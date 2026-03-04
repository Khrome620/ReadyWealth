using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Endpoints;
using ReadyWealth.Api.Persistence;
using ReadyWealth.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Persistence ──────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=readywealth.db"));

// ── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddSingleton<IMarketDataService, MockMarketDataService>();
builder.Services.AddScoped<IPaperOrderService, PaperOrderService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IWatchlistService, WatchlistService>();

// ── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5175", "http://localhost:5173",
                            "http://localhost:5174", "http://localhost:5176",
                            "http://localhost:5177")
              .AllowAnyHeader()
              .AllowAnyMethod()));

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ── Endpoints ────────────────────────────────────────────────────────────────
app.MapStocksEndpoints();
app.MapWalletEndpoints();
app.MapOrderEndpoints();
app.MapRecommendationsEndpoints();
app.MapTransactionEndpoints();
app.MapPositionEndpoints();
app.MapWatchlistEndpoints();

// ── Ensure DB is created and migrations applied ───────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();

// Required by WebApplicationFactory<Program> in integration tests
public partial class Program { }
