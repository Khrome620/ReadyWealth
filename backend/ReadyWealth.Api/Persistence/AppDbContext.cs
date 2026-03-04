using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Domain;

namespace ReadyWealth.Api.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    /// <summary>Well-known seed wallet GUID — single-user app, one wallet row forever.</summary>
    public static readonly Guid SeedWalletId = new("11111111-1111-1111-1111-111111111111");

    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<WatchlistEntry> WatchlistEntries => Set<WatchlistEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Wallet — single row, well-known ID
        modelBuilder.Entity<Wallet>(e =>
        {
            e.Property(w => w.Balance).HasColumnType("TEXT").HasPrecision(18, 2);
            e.HasData(new Wallet
            {
                Id = new Guid("11111111-1111-1111-1111-111111111111"),
                Balance = 100_000.00m,
                UpdatedAt = new DateTimeOffset(2026, 3, 3, 0, 0, 0, TimeSpan.FromHours(8))
            });
        });

        modelBuilder.Entity<Order>(e =>
        {
            e.Property(o => o.Amount).HasColumnType("TEXT").HasPrecision(18, 2);
            e.Property(o => o.Shares).HasColumnType("TEXT").HasPrecision(18, 6);
            e.Property(o => o.EntryPrice).HasColumnType("TEXT").HasPrecision(18, 4);
        });

        modelBuilder.Entity<Transaction>(e =>
        {
            e.Property(t => t.Amount).HasColumnType("TEXT").HasPrecision(18, 2);
            e.Property(t => t.RealizedPnl).HasColumnType("TEXT").HasPrecision(18, 2);
            e.Property(t => t.ClosingPrice).HasColumnType("TEXT").HasPrecision(18, 4);
        });
    }
}
