# API Contract: User Authentication & Per-User Data Isolation

**Branch**: `002-user-auth` | **Date**: 2026-03-04
**Base path**: `/api/v1/`
**Auth mechanism**: HttpOnly cookie `rw_auth` containing a Sprout JWT (set by login endpoint).

All existing endpoints (`/api/v1/positions`, `/api/v1/transactions`, `/api/v1/wallet`) are unchanged in shape but now require authentication and return only data belonging to the authenticated user.

---

## New Endpoints

### POST /api/v1/auth/login

Authenticates a user against the Sprout HR Auth service. On success sets an HttpOnly cookie and returns the user profile. No Authorization header required.

**Request**

```json
{
  "domain":   "string (required) — Sprout tenant domain name",
  "username": "string (required) — Sprout login username",
  "password": "string (required) — Sprout account password"
}
```

**Response — 200 OK**

```json
{
  "user": {
    "id":        "string — Sprout EmployeeId",
    "username":  "string",
    "firstName": "string",
    "lastName":  "string",
    "clientId":  "integer"
  }
}
```

Sets response cookie:
```
Set-Cookie: rw_auth=<JWT>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

**Response — 401 Unauthorized**

```json
{ "error": "invalid_credentials", "message": "The username or password is incorrect." }
```

**Response — 503 Service Unavailable** (Sprout auth unreachable)

```json
{ "error": "auth_service_unavailable", "message": "Authentication service is temporarily unavailable. Please try again shortly." }
```

**Response — 400 Bad Request** (missing/empty fields)

```json
{ "error": "validation_error", "errors": { "domain": ["Domain is required."] } }
```

---

### POST /api/v1/auth/logout

Terminates the current session by clearing the auth cookie. Requires a valid session cookie.

**Request**: No body.

**Response — 200 OK**

```json
{ "message": "Logged out successfully." }
```

Clears response cookie:
```
Set-Cookie: rw_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

**Response — 401 Unauthorized**: No active session.

---

### GET /api/v1/auth/me

Returns the current authenticated user's profile. Used by the frontend on page load / refresh to hydrate the auth store without re-entering credentials.

**Request**: No body. Requires `rw_auth` cookie.

**Response — 200 OK**

```json
{
  "user": {
    "id":        "string",
    "username":  "string",
    "firstName": "string",
    "lastName":  "string",
    "clientId":  "integer"
  }
}
```

**Response — 401 Unauthorized**: Cookie absent, invalid, or expired.

---

## Modified Existing Endpoints

All existing `/api/v1/` endpoints now:

1. **Require** the `rw_auth` cookie. Return `401 Unauthorized` if absent or invalid.
2. **Scope** all reads and writes to `UserId` of the authenticated user — enforced at the ORM layer via Global Query Filters. No changes to request/response shapes.

| Endpoint | Change |
|----------|--------|
| `GET /api/v1/wallet` | Now returns wallet belonging to authenticated user only |
| `POST /api/v1/orders` | Position and transaction created with `UserId` of authenticated user |
| `GET /api/v1/positions` | Returns only authenticated user's open positions |
| `POST /api/v1/positions/{id}/close` | Only owner may close their own position (returns 403 if mismatch) |
| `GET /api/v1/transactions` | Returns only authenticated user's transaction history |
| `GET /api/v1/market` | Unchanged — market data is shared, no user scoping needed |

### 401 Unauthorized (all protected endpoints)

```json
{ "error": "unauthorized", "message": "Authentication required. Please log in." }
```

### 403 Forbidden (cross-user access attempt)

```json
{ "error": "forbidden", "message": "You do not have access to this resource." }
```

---

## Authentication Flow Diagram

```
Browser                  ReadyWealth API           Sprout HR Auth
   │                          │                          │
   │  POST /api/v1/auth/login │                          │
   │  { domain, username, pw }│                          │
   │─────────────────────────>│                          │
   │                          │  POST /connect/token     │
   │                          │  (client_id, secret,     │
   │                          │   username, password)    │
   │                          │─────────────────────────>│
   │                          │  200 { access_token }    │
   │                          │<─────────────────────────│
   │                          │  Decode SessionDataClaim │
   │                          │  Upsert User record      │
   │                          │  Provision Wallet if new │
   │  200 { user profile }    │                          │
   │  Set-Cookie: rw_auth=JWT │                          │
   │<─────────────────────────│                          │
   │                          │                          │
   │  GET /api/v1/wallet      │                          │
   │  Cookie: rw_auth=JWT     │                          │
   │─────────────────────────>│                          │
   │                          │  Validate JWT from cookie│
   │                          │  Filter by UserId        │
   │  200 { balance: 300000 } │                          │
   │<─────────────────────────│                          │
```
