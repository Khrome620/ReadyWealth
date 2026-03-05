using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Services;
using ReadyWealth.Tests.TestHelpers;

namespace ReadyWealth.Tests.Integration.Endpoints;

public class RecommendationsEndpointsTests : IClassFixture<AuthenticatedTestFactory>
{
    private readonly AuthenticatedTestFactory _factory;
    private readonly HttpClient _client;

    public RecommendationsEndpointsTests(AuthenticatedTestFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ── 200 OK — normal operation ─────────────────────────────────────────────

    [Fact]
    public async Task GetRecommendations_Returns200()
    {
        var response = await _client.GetAsync("/api/v1/recommendations");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetRecommendations_ResponseHasRecommendationsArray()
    {
        var response = await _client.GetAsync("/api/v1/recommendations");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("recommendations", out var recs));
        Assert.Equal(JsonValueKind.Array, recs.ValueKind);
        Assert.True(recs.GetArrayLength() >= 3, $"Expected ≥3 recommendations, got {recs.GetArrayLength()}");
    }

    [Fact]
    public async Task GetRecommendations_ResponseHasGeneratedAt()
    {
        var response = await _client.GetAsync("/api/v1/recommendations");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("generatedAt", out _), "Response missing 'generatedAt'");
    }

    [Fact]
    public async Task GetRecommendations_ResponseHasDisclaimer()
    {
        var response = await _client.GetAsync("/api/v1/recommendations");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("disclaimer", out var disclaimer));
        Assert.Contains("Not financial advice", disclaimer.GetString());
    }

    [Fact]
    public async Task GetRecommendations_EachRecommendationHasRequiredFields()
    {
        var response = await _client.GetAsync("/api/v1/recommendations");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var recs = doc.RootElement.GetProperty("recommendations");

        foreach (var rec in recs.EnumerateArray())
        {
            Assert.True(rec.TryGetProperty("ticker", out _), "Recommendation missing 'ticker'");
            Assert.True(rec.TryGetProperty("name", out _), "Recommendation missing 'name'");
            Assert.True(rec.TryGetProperty("currentPrice", out _), "Recommendation missing 'currentPrice'");
            Assert.True(rec.TryGetProperty("reason", out _), "Recommendation missing 'reason'");
            Assert.True(rec.TryGetProperty("confidence", out _), "Recommendation missing 'confidence'");
        }
    }

    [Fact]
    public async Task GetRecommendations_ConfidenceIsValidValue()
    {
        var response = await _client.GetAsync("/api/v1/recommendations");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var recs = doc.RootElement.GetProperty("recommendations");

        foreach (var rec in recs.EnumerateArray())
        {
            var confidence = rec.GetProperty("confidence").GetString();
            var valid = new[] { "high", "medium", "low" };
            Assert.Contains(valid, v => v == confidence);
        }
    }

    // ── 503 — insufficient market data ───────────────────────────────────────

    [Fact]
    public async Task GetRecommendations_Returns503_WhenInsufficientMarketData()
    {
        // Create a client from a factory that injects a stub returning only 2 stocks
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove real IMarketDataService
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IMarketDataService));
                if (descriptor != null) services.Remove(descriptor);

                // Stub returns 2 negative-changePct stocks → 0 topMovers + 2 topVolume = 2 < 3
                var stub = Substitute.For<IMarketDataService>();
                stub.GetAllStocksAsync().Returns(Task.FromResult<IEnumerable<Stock>>(
                [
                    new Stock("XX", "X Corp.", 10m, -1m, -1m, 5000, DateTimeOffset.UtcNow),
                    new Stock("YY", "Y Corp.", 20m, -2m, -2m, 4000, DateTimeOffset.UtcNow),
                ]));
                services.AddSingleton(stub);
            });
        }).CreateClient();

        var response = await client.GetAsync("/api/v1/recommendations");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task GetRecommendations_503Body_HasErrorField()
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IMarketDataService));
                if (descriptor != null) services.Remove(descriptor);

                var stub = Substitute.For<IMarketDataService>();
                stub.GetAllStocksAsync().Returns(Task.FromResult<IEnumerable<Stock>>([]));
                services.AddSingleton(stub);
            });
        }).CreateClient();

        var response = await client.GetAsync("/api/v1/recommendations");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("error", out var error));
        Assert.Contains("insufficient", error.GetString(), StringComparison.OrdinalIgnoreCase);
    }

}
