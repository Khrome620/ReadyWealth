# Quickstart: ReadyWealth Investment Dashboard

**Branch**: `001-investment-dashboard` | **Date**: 2026-03-03

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | bundled with Node.js |
| .NET SDK | 10.x | [dot.net](https://dot.net) |
| Git | any | bundled with most platforms |

---

## 1. Clone & setup

```bash
git clone <repo-url>
cd ReadyWealth
git checkout 001-investment-dashboard
```

---

## 2. Frontend (Vue 3 SPA) — already implemented

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The frontend starts with 20 mock PSE stocks loaded from `MockMarketService.ts`.
No backend required to run the SPA in mock mode.

**Available pages**:
- `/` — Dashboard (Wallet | Market Feed | Advice Corner)
- `/portfolio` — Open positions with P&L
- `/transactions` — Transaction history

---

## 3. Backend (.NET 10 Minimal API) — to be created

> **Note**: The backend has not been scaffolded yet. Follow these steps once Phase 1 is complete.

```bash
cd backend/ReadyWealth.Api
dotnet restore
dotnet ef database update      # runs migrations, creates readywealth.db
dotnet run
# → http://localhost:5000
# → http://localhost:5000/swagger  (Swagger UI)
```

---

## 4. Run with both frontend + backend

Once the backend is running, configure the frontend to call it:

```bash
# frontend/.env.development
VITE_API_BASE_URL=http://localhost:5000
```

Then restart the frontend dev server:

```bash
cd frontend && npm run dev
```

---

## 5. Run tests

### Frontend unit tests

```bash
cd frontend
npm run test            # run once
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```

### Backend tests

```bash
cd backend
dotnet test                          # all tests
dotnet test --filter Category=Unit   # unit tests only
dotnet test --filter Category=Integration
dotnet-coverage collect dotnet test  # with coverage
```

---

## 6. Build for production

```bash
# Frontend
cd frontend && npm run build
# Output: frontend/dist/

# Backend
cd backend/ReadyWealth.Api
dotnet publish -c Release -o publish/
```

---

## Key Commands Reference

| Task | Command |
|------|---------|
| Start frontend (mock mode) | `cd frontend && npm run dev` |
| Start backend | `cd backend/ReadyWealth.Api && dotnet run` |
| Frontend unit tests | `cd frontend && npm test` |
| Backend tests | `cd backend && dotnet test` |
| Add EF migration | `dotnet ef migrations add <Name>` (from Api project) |
| Lint frontend | `cd frontend && npm run lint` |

---

## Environment Variables

### Frontend (`frontend/.env.development`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | _(empty — uses mock services)_ | Backend API base URL |

### Backend (`backend/ReadyWealth.Api/appsettings.Development.json`)

| Key | Default | Description |
|-----|---------|-------------|
| `ConnectionStrings:Default` | `Data Source=readywealth.db` | SQLite DB file path |
| `AllowedOrigins` | `http://localhost:5173` | CORS origins for SPA |

---

## Troubleshooting

**Port 5173 already in use**: Vite will automatically try 5174, 5175, etc. Update `VITE_API_BASE_URL` accordingly.

**`design-system-next/style.css` not found**: Run `npm install` in the `frontend/` directory.

**EF Core migration errors**: Ensure you are running `dotnet ef` from the `ReadyWealth.Api/` directory (not the solution root).

**CORS error in browser**: Ensure `AllowedOrigins` in `appsettings.Development.json` matches the exact URL (including port) shown in the Vite output.
