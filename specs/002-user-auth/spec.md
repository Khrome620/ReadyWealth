# Feature Specification: User Authentication & Per-User Data Isolation

**Feature Branch**: `002-user-auth`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "add a login feature that uses same mechanism as the authentication from Sprout TimeAttendance service then make a relationship the Wallet, Portfolios, Transactions to user logged."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login with Sprout Credentials (Priority: P1)

A registered Sprout user visits ReadyWealth and is presented with a login screen. They enter their Sprout username and password, and upon successful authentication receive access to their personal trading dashboard. All data they see (wallet balance, portfolio, transaction history) belongs exclusively to their account.

**Why this priority**: Without authentication, no user isolation is possible. This is the foundation all other stories depend on.

**Independent Test**: A user can log in with valid Sprout credentials and reach the dashboard. A user with invalid credentials is rejected with a clear error message.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they navigate to any ReadyWealth page, **Then** they are redirected to the login screen.
2. **Given** the login screen, **When** a user submits valid Sprout credentials, **Then** they are authenticated and redirected to their personal dashboard.
3. **Given** the login screen, **When** a user submits invalid credentials, **Then** they see a clear error message and remain on the login screen.
4. **Given** an authenticated user, **When** their session expires, **Then** they are redirected to the login screen and prompted to log in again.
5. **Given** an authenticated user, **When** they click "Sign Out", **Then** their session is terminated and they are returned to the login screen.

---

### User Story 2 - Per-User Wallet Isolation (Priority: P2)

Each authenticated user has their own wallet with an independent balance. User A's balance, deposits, and credits are completely separate from User B's. A user can only see and interact with their own wallet.

**Why this priority**: Without wallet isolation, users could see or affect each other's balances — a critical data integrity issue.

**Independent Test**: Two different users log in separately; each sees only their own wallet balance and any changes made by one user are not visible to the other.

**Acceptance Scenarios**:

1. **Given** two users (User A and User B) with separate accounts, **When** User A logs in, **Then** User A sees only their own wallet balance.
2. **Given** User A places a trade that debits their wallet, **When** User B logs in, **Then** User B's wallet balance is unaffected.
3. **Given** a new user logs in for the first time, **When** they view their wallet, **Then** they start with a defined initial paper-trading balance.

---

### User Story 3 - Per-User Positions & Transaction Isolation (Priority: P3)

Each authenticated user's open positions and transaction history are scoped to their account. A user sees only the trades they have placed — not trades placed by other users.

**Why this priority**: Completes the full data isolation model. Depends on P1 and P2 being in place.

**Independent Test**: User A places a trade; User B logs in and sees no trace of User A's trade in their portfolio or transaction history.

**Acceptance Scenarios**:

1. **Given** User A has open positions, **When** User B logs in and views the portfolio, **Then** User B sees only their own positions (none of User A's).
2. **Given** User A has transaction history, **When** User B views their transaction history, **Then** User B sees only their own transactions.
3. **Given** User A closes a position, **When** User A views their transaction history, **Then** the closed record appears only in User A's history.

---

### Edge Cases

- A user whose Sprout account is deactivated mid-session retains access until their token expires naturally; no immediate forced logout occurs.
- If the Sprout auth service is unreachable during login, the login endpoint returns a service-unavailable error and the login form displays a clear, actionable message (FR-011; tested in T019).
- A first-time user who has no existing ReadyWealth data is automatically provisioned with a ₱300,000 wallet upon successful login; no manual setup is required (FR-004, FR-005; tested in T040).
- If a session expires during an in-progress order flow, the next API call returns 401, the session is cleared, and the user is redirected to `/login?redirect=<current path>` without data loss (FR-013; tested via T036).
- Concurrent sessions (same user, multiple devices or tabs) are permitted; each session holds its own valid JWT cookie and reads the same server-side data (Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authenticate users exclusively using the Sprout HR Auth service — no separate ReadyWealth registration or password management.
- **FR-002**: Unauthenticated users MUST be redirected to the login page when accessing any protected page.
- **FR-003**: The system MUST display a login form with three required fields: domain name, username/email, and password. The domain name is passed to the Sprout HR Auth service to resolve the correct tenant.
- **FR-004**: Upon successful authentication, the system MUST create a user profile in ReadyWealth (if one does not already exist) linked to the authenticated Sprout user identity.
- **FR-005**: Upon first login, the system MUST automatically provision a wallet for the new user with a starting paper-trading balance of ₱300,000 (configurable).
- **FR-006**: The system MUST associate all wallet data (balance, credits, debits) with the authenticated user's identity so that no two users share a wallet.
- **FR-007**: The system MUST associate all portfolio positions with the authenticated user's identity.
- **FR-008**: The system MUST associate all transaction records with the authenticated user's identity.
- **FR-009**: Users MUST only be able to read and modify their own wallet, portfolio positions, and transactions — access to another user's data MUST be denied.
- **FR-010**: The system MUST provide a "Sign Out" action that terminates the current session.
- **FR-011**: The system MUST display a clear, user-friendly error message when login fails (invalid credentials, inactive account, auth service unavailable).
- **FR-012**: After a successful login, the system MUST redirect the user to the page they originally requested before being sent to the login screen.
- **FR-013**: The system MUST handle session expiry gracefully — re-prompting for login without losing the user's intended destination.
- **FR-014**: The backend MUST store the Sprout JWT in an HttpOnly cookie after successful authentication. The raw token MUST NOT be exposed to the frontend at any point.
- **FR-015**: The frontend MUST clear all localStorage data (wallet, positions, transactions) upon successful login. All user data is thereafter sourced exclusively from the server.

### Key Entities

- **User**: Represents an authenticated Sprout user within ReadyWealth. Identified by their Sprout user identity (employee/user ID from the auth token). Serves as the owner of all financial data. Key attributes: Sprout user ID, domain name, display name, email, first login date.
- **Wallet**: Belongs to exactly one User. Stores the user's current paper-trading balance. Created automatically on the user's first login.
- **Position**: Belongs to exactly one User. Represents an open trade. All position reads and writes are scoped to the owning user.
- **Transaction**: Belongs to exactly one User. Records every order event (open, close). All transaction reads and writes are scoped to the owning user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log in with valid Sprout credentials and reach their personal dashboard in under 5 seconds.
- **SC-002**: 100% of data reads (wallet, positions, transactions) return only records belonging to the authenticated user — zero cross-user data leakage under any circumstance.
- **SC-003**: A first-time user who successfully logs in has their wallet automatically provisioned with ₱300,000 and is ready to place trades within that same login interaction, with no additional setup steps required.
- **SC-004**: An invalid login attempt is rejected with an informative error message within 3 seconds.
- **SC-005**: A signed-out or session-expired user attempting to access any protected page is redirected to the login screen within 1 second.
- **SC-006**: Session expiry does not result in data loss — a user can log back in and resume from where they left off.

## Clarifications

### Session 2026-03-04

- Q: Does the user enter credentials into a ReadyWealth-hosted login form or get redirected to a Sprout-hosted login page? → A: ReadyWealth hosts its own login form; credentials (domain name, username/email, password) are submitted to the ReadyWealth backend which proxies authentication to the Sprout HR Auth service. Domain name is a required field because Sprout Auth uses it to resolve the correct tenant.
- Q: Where is the JWT stored after login on the client side? → A: The backend sets an HttpOnly cookie containing the JWT; the frontend never accesses the raw token directly.
- Q: When a Sprout account is deactivated mid-session, how does ReadyWealth respond? → A: The token is trusted until it expires naturally; no live per-request revocation check is performed against Sprout.
- Q: What is the starting paper-trading wallet balance for new users? → A: ₱300,000.
- Q: What happens to existing localStorage mock data when a user logs in for the first time? → A: Discard it; every authenticated user starts fresh with ₱300,000 and no prior positions or transactions.

## Assumptions

- The Sprout HR Auth service is reachable from the ReadyWealth backend at a configurable URL.
- ReadyWealth does not manage its own user directory — user identity is fully delegated to the Sprout auth service.
- The Sprout JWT token carries sufficient claims to uniquely identify a user (user ID, name, email) without a separate profile lookup.
- New users receive a starting wallet balance of ₱300,000 in paper-trading funds; this value is configurable and must not be hardcoded.
- The JWT is delivered to the client as an HttpOnly cookie; the frontend relies on cookie-based session state rather than reading the token directly.
- Session lifetime follows the Sprout token expiry; ReadyWealth does not extend or shorten the token lifetime independently.
- Concurrent sessions (same user, multiple devices or browser tabs) are permitted — each holds its own valid token.
- The login page is the only publicly accessible route; all other routes require a valid session.
- Existing localStorage-based mock data (wallet, positions, transactions) is discarded when authentication is introduced. Every authenticated user begins with a clean account (₱300,000 wallet, no positions, no transactions). No migration of pre-auth data is performed.
