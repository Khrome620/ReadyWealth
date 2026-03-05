# Data Model: User Authentication & Per-User Data Isolation

**Branch**: `002-user-auth` | **Date**: 2026-03-04

---

## New Entity: User

Represents an authenticated Sprout employee who has logged into ReadyWealth at least once.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `string` | PK, NOT NULL | Sprout `EmployeeId` (int) stored as string. Stable, globally unique per employee. |
| `DomainName` | `string` | NOT NULL | Sprout tenant domain used at login (e.g., `"sprout"`). |
| `Username` | `string` | NOT NULL | Sprout login username from `SessionDataClaim.Username`. |
| `FirstName` | `string` | NOT NULL | From `SessionDataClaim.FirstName`. |
| `LastName` | `string` | NOT NULL | From `SessionDataClaim.LastName`. |
| `ClientId` | `int` | NOT NULL | Sprout multi-tenant client ID from token. |
| `CreatedAt` | `DateTime` | NOT NULL | UTC timestamp of first login / account creation. |
| `LastLoginAt` | `DateTime` | NOT NULL | UTC timestamp of most recent successful login. Updated on every login. |

**Relationships**:
- Has one `Wallet` (1:1, created on first login)
- Has many `Position` (1:N)
- Has many `Transaction` (1:N)

**Validation rules**:
- `Id` must be a non-empty string matching the Sprout EmployeeId.
- `DomainName`, `Username`, `FirstName`, `LastName` must be non-empty.
- `CreatedAt` is set once at insert; never updated.

---

## Modified Entity: Wallet

**New field added**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `UserId` | `string` | FK → `User.Id`, NOT NULL | Owner of this wallet. One wallet per user. |

**Unique constraint**: `UserId` (one wallet per user — enforced at DB level).

**Starting balance**: `₱300,000` set at provisioning time (first login). Configurable via `appsettings.json` key `ReadyWealth:InitialWalletBalance`.

**Global Query Filter**: All queries automatically filtered by `UserId == currentUser.Id`.

---

## Modified Entity: Position

**New field added**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `UserId` | `string` | FK → `User.Id`, NOT NULL | Owner of this position. |

**Global Query Filter**: All queries automatically filtered by `UserId == currentUser.Id`.

**Index**: Add composite index on `(UserId, Ticker)` for efficient per-user lookups.

---

## Modified Entity: Transaction

**New field added**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `UserId` | `string` | FK → `User.Id`, NOT NULL | Owner of this transaction record. |

**Global Query Filter**: All queries automatically filtered by `UserId == currentUser.Id`.

**Index**: Add index on `(UserId, Date DESC)` for efficient per-user history queries.

---

## Entity Relationship Diagram

```
User (Id PK)
 ├── Wallet (UserId FK, UNIQUE) — 1:1
 ├── Position (UserId FK) — 1:N
 └── Transaction (UserId FK) — 1:N
```

---

## Migration Strategy

Because existing dev data has no concept of user ownership, and per clarification Q5 all pre-auth data is discarded:

1. **Migration 1 — Add User table**: Create `Users` table with all fields above.
2. **Migration 2 — Add UserId columns**: Add `UserId` as nullable string to `Wallets`, `Positions`, `Transactions`.
3. **Migration 3 — Clear dev data**: `DELETE FROM Wallets; DELETE FROM Positions; DELETE FROM Transactions;` (dev data has no owner and must not be migrated).
4. **Migration 4 — Make UserId NOT NULL**: Alter columns (SQLite: table rebuild) and add FK constraints and indexes.

In production, steps 3 and 4 are a single transaction.

---

## Infrastructure: ICurrentUserService

```
ICurrentUserService
 └── UserId: string  — from SessionDataClaim.EmployeeId via IHttpContextAccessor
```

Registered as **scoped** (per-request). Injected into `ReadyWealthDbContext` and all service classes.

The `DbContext` applies Global Query Filters at `OnModelCreating` time using the scoped `ICurrentUserService` — ensuring every EF query is automatically user-scoped without developer intervention.

---

## First-Login Provisioning Sequence

```
1. POST /api/v1/auth/login received
2. Credentials forwarded to Sprout HR Auth → JWT returned
3. SessionDataClaim decoded → EmployeeId extracted
4. DB lookup: User.Id == EmployeeId?
   ├── EXISTS → update LastLoginAt; skip provisioning
   └── NOT EXISTS →
        a. INSERT User record
        b. INSERT Wallet { UserId, Balance = 300_000 }
        (all in one DB transaction)
5. HttpOnly cookie set with JWT
6. Return user profile to frontend
```
