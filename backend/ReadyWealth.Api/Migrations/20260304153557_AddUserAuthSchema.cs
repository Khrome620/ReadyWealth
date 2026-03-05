using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReadyWealth.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAuthSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Create Users table ─────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id          = table.Column<string>(type: "TEXT", nullable: false),
                    DomainName  = table.Column<string>(type: "TEXT", nullable: false),
                    Username    = table.Column<string>(type: "TEXT", nullable: false),
                    FirstName   = table.Column<string>(type: "TEXT", nullable: false),
                    LastName    = table.Column<string>(type: "TEXT", nullable: false),
                    ClientId    = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt   = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            // ── Clear existing dev seed data (no valid UserId) ─────────────────
            migrationBuilder.Sql("DELETE FROM Wallets;");
            migrationBuilder.Sql("DELETE FROM Orders;");
            migrationBuilder.Sql("DELETE FROM Transactions;");

            // ── Add UserId columns (nullable — SQLite ALTER TABLE ADD COLUMN) ──
            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Wallets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Orders",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Transactions",
                type: "TEXT",
                nullable: true);

            // ── Add indexes ────────────────────────────────────────────────────
            migrationBuilder.CreateIndex(
                name: "IX_Wallets_UserId",
                table: "Wallets",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId_Ticker",
                table: "Orders",
                columns: new[] { "UserId", "Ticker" });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UserId_CreatedAt",
                table: "Transactions",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex("IX_Wallets_UserId", "Wallets");
            migrationBuilder.DropIndex("IX_Orders_UserId_Ticker", "Orders");
            migrationBuilder.DropIndex("IX_Transactions_UserId_CreatedAt", "Transactions");

            migrationBuilder.DropColumn("UserId", "Wallets");
            migrationBuilder.DropColumn("UserId", "Orders");
            migrationBuilder.DropColumn("UserId", "Transactions");

            migrationBuilder.DropTable("Users");
        }
    }
}
