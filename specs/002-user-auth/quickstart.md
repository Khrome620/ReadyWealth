# Quickstart: User Authentication & Per-User Data Isolation

**Branch**: `002-user-auth` | **Date**: 2026-03-04

---

## Prerequisites

- .NET 10 SDK installed
- Node.js 20+ installed
- Access to the Sprout HR Auth service (URL + client credentials)
- ReadyWealth repo cloned, on branch `002-user-auth`

---

## Configuration

### Backend (`backend/ReadyWealth.Api/appsettings.Development.json`)

Add the following settings:

```json
{
  "SproutAuth": {
    "BaseUrl":      "https://<sprout-auth-host>/connect/token",
    "ClientId":     "<your-client-id>",
    "ClientSecret": "<your-client-secret>"
  },
  "AppSettings": {
    "Secret": "<same-symmetric-key-as-sprout-localauth>"
  },
  "ReadyWealth": {
    "InitialWalletBalance": 300000.00
  },
  "Cookie": {
    "Name":    "rw_auth",
    "MaxAge":  3600,
    "Secure":  false
  }
}
```

> **Note**: Set `Cookie:Secure = false` for local HTTP development. Set to `true` in production.

---

## Running the App

### Backend

```bash
cd backend/ReadyWealth.Api
dotnet run
# API available at http://localhost:5124
# Swagger UI at http://localhost:5124/swagger
```

Apply migrations on first run (runs automatically via `app.UseEfMigrations()` in dev mode):

```bash
dotnet ef database update
```

### Frontend

```bash
cd frontend
npm run dev
# App available at http://localhost:5173 (or next available port)
```

The frontend Vite proxy routes `/api/*` to `http://localhost:5124` automatically.

---

## Testing Login

1. Navigate to `http://localhost:5173` — you will be redirected to `/login`.
2. Enter your Sprout **Domain**, **Username**, and **Password**.
3. On success you are redirected to the dashboard with your personal ₱300,000 wallet.
4. Open DevTools → Application → Cookies — confirm `rw_auth` is `HttpOnly` (not readable by JS).

### Verify per-user isolation

1. Log in as User A → place a trade.
2. Sign out → log in as User B → confirm their portfolio and wallet are independent.

---

## Running Tests

### Backend

```bash
cd backend
dotnet test --collect:"XPlat Code Coverage"
# Coverage report generated in TestResults/
```

### Frontend

```bash
cd frontend
npm test
# Vitest runs in watch mode; press q to quit
```

---

## Performance Acceptance Checks

The following success criteria require manual timing verification (no automated perf test tasks exist):

| Criterion | Target | How to verify |
|-----------|--------|---------------|
| SC-001: Login round-trip | ≤ 5 seconds | Open DevTools → Network. Submit valid credentials. Measure time from request start to dashboard render. |
| SC-004: Invalid login rejection | ≤ 3 seconds | Submit invalid credentials. Measure time from request start to error message appearing on screen. |
| SC-005: Unauthenticated redirect | ≤ 1 second | Clear cookies. Navigate directly to `/`. Measure time to `/login` redirect completion. |

> All three checks should be verified in the Polish phase (T067) before marking the feature complete.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Login returns 503 | Sprout auth unreachable | Check `SproutAuth:BaseUrl` in appsettings |
| Login returns 401 | Wrong credentials or domain | Verify domain name matches Sprout tenant |
| Redirected to login on every page | Cookie not set | Ensure `Cookie:Secure = false` in dev (not HTTPS) |
| Empty wallet after login | Migration not applied | Run `dotnet ef database update` |
| CORS error on login | Vite proxy not routing | Check `vite.config.ts` proxy target matches backend port |
