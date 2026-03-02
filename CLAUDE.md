# ReadyWealth Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-03

## Active Technologies

- TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend) + Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 (backend) (001-investment-dashboard)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend): Follow standard conventions

## Recent Changes

- 001-investment-dashboard: Added TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend) + Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 (backend)

<!-- MANUAL ADDITIONS START -->

## Architecture Notes

- **Frontend**: Vue 3 SPA (NOT React — see constitution deviation in plan.md). Design system (`design-system-next`) is installed as a Vue plugin via `app.use(DesignSystem)` — all `Spr*` components are globally registered. **Do NOT import Spr* components in `<script setup>`**.
- **Backend**: .NET 10 Minimal API (not yet scaffolded). Target path: `backend/ReadyWealth.Api/`.
- **Data layers are abstracted**: `IMarketService` (frontend) / `IMarketDataService` (backend) are swap boundaries for real-time PSE feed. `IOrderService` / `IPaperOrderService` are swap boundaries for real brokerage.
- **Persistence**: SQLite (dev) / SQLite `:memory:` (tests). Swap to PostgreSQL by changing one line.

## Key File Paths

| Path | Purpose |
|------|---------|
| `frontend/src/main.ts` | Vue app bootstrap |
| `frontend/src/stores/` | 6 Pinia stores (market, wallet, positions, transactions, watchlist, advice) |
| `frontend/src/services/` | IMarketService, IOrderService + Mock/Paper implementations |
| `frontend/src/composables/useSnack.ts` | Toast notifications via DS snackbar store |
| `specs/001-investment-dashboard/plan.md` | Full implementation plan |
| `specs/001-investment-dashboard/contracts/api.md` | REST API endpoint contracts |
| `specs/001-investment-dashboard/data-model.md` | All domain entity definitions |
| `.specify/memory/constitution.md` | Project constitution v1.1.0 |

## Frontend Dev Commands

```bash
cd frontend
npm run dev        # Vite dev server (mock mode, no backend needed)
npm run build      # Production build → dist/
npm test           # Vitest unit tests (once configured)
npm run lint       # ESLint
```

## Constitution Deviations (documented)

| Deviation | Justification |
|-----------|---------------|
| Vue 3 instead of React | `design-system-next` is Vue 3-only; no React equivalent exists |
| Frontend before API contract | Hackathon constraint; `IMarketService`/`IOrderService` interfaces proxy the contract |

<!-- MANUAL ADDITIONS END -->
