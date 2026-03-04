using ReadyWealth.Api.Domain;

namespace ReadyWealth.Api.Services;

public class MockMarketDataService : IMarketDataService
{
    private static readonly Random _rng = new();
    private static readonly TimeZoneInfo _pht = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "Singapore Standard Time" : "Asia/Singapore");

    private static readonly Stock[] _seed =
    [
        new("SM",   "SM Investments Corp.",             912.00m,   12.00m,  1.33m,  1_245_300, DateTimeOffset.UtcNow),
        new("ALI",  "Ayala Land Inc.",                   28.50m,    0.50m,  1.79m,  5_120_000, DateTimeOffset.UtcNow),
        new("BDO",  "BDO Unibank Inc.",                 130.00m,    2.50m,  1.96m,  2_340_000, DateTimeOffset.UtcNow),
        new("BPI",  "Bank of the Philippine Islands",   108.00m,   -1.00m, -0.92m,  1_870_000, DateTimeOffset.UtcNow),
        new("JFC",  "Jollibee Foods Corp.",             212.00m,    3.00m,  1.43m,  980_000,   DateTimeOffset.UtcNow),
        new("MBT",  "Metropolitan Bank & Trust",         52.00m,   -0.50m, -0.95m,  3_210_000, DateTimeOffset.UtcNow),
        new("MEG",  "Megaworld Corp.",                    2.10m,    0.05m,  2.44m, 18_500_000, DateTimeOffset.UtcNow),
        new("MPI",  "Metro Pacific Investments",          4.50m,    0.10m,  2.27m,  8_900_000, DateTimeOffset.UtcNow),
        new("SMPH", "SM Prime Holdings Inc.",            33.00m,    0.50m,  1.54m,  4_320_000, DateTimeOffset.UtcNow),
        new("TEL",  "PLDT Inc.",                       1_310.00m, -10.00m, -0.76m,  345_000,   DateTimeOffset.UtcNow),
        new("AC",   "Ayala Corporation",               740.00m,    8.00m,  1.09m,  560_000,   DateTimeOffset.UtcNow),
        new("AEV",  "Aboitiz Equity Ventures",          56.00m,    1.00m,  1.82m,  1_450_000, DateTimeOffset.UtcNow),
        new("AGI",  "Alliance Global Group",             10.20m,    0.20m,  2.00m,  9_800_000, DateTimeOffset.UtcNow),
        new("DMC",  "DMCI Holdings Inc.",                9.50m,   -0.10m, -1.04m,  6_700_000, DateTimeOffset.UtcNow),
        new("EMP",  "Emperador Inc.",                   18.50m,    0.50m,  2.78m,  7_100_000, DateTimeOffset.UtcNow),
        new("FLI",  "Filinvest Land Inc.",               1.15m,    0.03m,  2.68m, 22_000_000, DateTimeOffset.UtcNow),
        new("GLO",  "Globe Telecom Inc.",             1_900.00m,  -20.00m, -1.04m,  120_000,   DateTimeOffset.UtcNow),
        new("ICT",  "International Container Terminal", 210.00m,    4.00m,  1.94m,  430_000,   DateTimeOffset.UtcNow),
        new("LTG",  "LT Group Inc.",                    12.80m,    0.30m,  2.40m,  5_400_000, DateTimeOffset.UtcNow),
        new("RLC",  "Robinsons Land Corp.",             15.20m,    0.20m,  1.33m,  3_800_000, DateTimeOffset.UtcNow),
    ];

    private Stock[] _current = _seed.ToArray();
    private DateTimeOffset _lastUpdated = DateTimeOffset.UtcNow;

    public Task<IEnumerable<Stock>> GetAllStocksAsync()
    {
        Fluctuate();
        return Task.FromResult<IEnumerable<Stock>>(_current);
    }

    public Task<bool> GetMarketStatusAsync()
    {
        var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, _pht);
        var isWeekday = now.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday;
        var open = new TimeOnly(9, 30);
        var close = new TimeOnly(15, 30);
        var timeNow = TimeOnly.FromTimeSpan(now.TimeOfDay);
        return Task.FromResult(isWeekday && timeNow >= open && timeNow <= close);
    }

    public Task<DateTimeOffset> GetLastUpdatedAsync() =>
        Task.FromResult(_lastUpdated);

    public Task<IEnumerable<Stock>> GetGainersAsync() =>
        Task.FromResult<IEnumerable<Stock>>(
            _current.Where(s => s.ChangePct > 0).OrderByDescending(s => s.ChangePct).Take(10));

    public Task<IEnumerable<Stock>> GetLosersAsync() =>
        Task.FromResult<IEnumerable<Stock>>(
            _current.Where(s => s.ChangePct < 0).OrderBy(s => s.ChangePct).Take(10));

    public Task<IEnumerable<Stock>> GetMostActiveAsync() =>
        Task.FromResult<IEnumerable<Stock>>(
            _current.OrderByDescending(s => s.Volume).Take(10));

    private void Fluctuate()
    {
        _current = _current.Select(s =>
        {
            var factor = 1m + (decimal)(_rng.NextDouble() * 0.004 - 0.002);
            var newPrice = Math.Round(s.Price * factor, 4);
            var change = Math.Round(newPrice - s.Price, 4);
            var changePct = s.Price == 0 ? 0 : Math.Round(change / s.Price * 100, 4);
            return s with { Price = newPrice, Change = change, ChangePct = changePct, AsOf = DateTimeOffset.UtcNow };
        }).ToArray();
        _lastUpdated = DateTimeOffset.UtcNow;
    }
}
