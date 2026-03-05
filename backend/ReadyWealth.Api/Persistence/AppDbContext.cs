using Microsoft.EntityFrameworkCore;
using ReadyWealth.Api.Domain;
using ReadyWealth.Api.Services;

namespace ReadyWealth.Api.Persistence;

public class AppDbContext(
    DbContextOptions<AppDbContext> options,
    ICurrentUserService currentUserService) : DbContext(options)
{
    public DbSet<User>           Users            => Set<User>();
    public DbSet<Wallet>         Wallets          => Set<Wallet>();
    public DbSet<Order>          Orders           => Set<Order>();
    public DbSet<Transaction>    Transactions     => Set<Transaction>();
    public DbSet<WatchlistEntry> WatchlistEntries => Set<WatchlistEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── User ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
        });

        // ── Wallet ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Wallet>(e =>
        {
            e.Property(w => w.Balance).HasColumnType("TEXT").HasPrecision(18, 2);
            e.HasOne<User>().WithOne().HasForeignKey<Wallet>(w => w.UserId);
            e.HasIndex(w => w.UserId).IsUnique();

            // Global Query Filter — every wallet query is automatically user-scoped
            e.HasQueryFilter(w => w.UserId == currentUserService.UserId);
        });

        // ── Order (Positions) ─────────────────────────────────────────────────
        modelBuilder.Entity<Order>(e =>
        {
            e.Property(o => o.Amount).HasColumnType("TEXT").HasPrecision(18, 2);
            e.Property(o => o.Shares).HasColumnType("TEXT").HasPrecision(18, 6);
            e.Property(o => o.EntryPrice).HasColumnType("TEXT").HasPrecision(18, 4);
            e.HasOne<User>().WithMany().HasForeignKey(o => o.UserId);
            e.HasIndex(o => new { o.UserId, o.Ticker });

            // Global Query Filter — every order query is automatically user-scoped
            e.HasQueryFilter(o => o.UserId == currentUserService.UserId);
        });

        // ── Transaction ───────────────────────────────────────────────────────
        modelBuilder.Entity<Transaction>(e =>
        {
            e.Property(t => t.Amount).HasColumnType("TEXT").HasPrecision(18, 2);
            e.Property(t => t.RealizedPnl).HasColumnType("TEXT").HasPrecision(18, 2);
            e.Property(t => t.ClosingPrice).HasColumnType("TEXT").HasPrecision(18, 4);
            e.HasOne<User>().WithMany().HasForeignKey(t => t.UserId);
            e.HasIndex(t => new { t.UserId, t.CreatedAt });

            // Global Query Filter — every transaction query is automatically user-scoped
            e.HasQueryFilter(t => t.UserId == currentUserService.UserId);
        });
    }
}
