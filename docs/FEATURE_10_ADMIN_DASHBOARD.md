# Feature 10 — Admin Dashboard

## Architecture

```
Browser (apps/admin :3001)
    │ Bearer JWT (ADMIN role)
    ▼
AdminController  @AdminAuth()  (= AuthGuard + RolesGuard)
  GET  /api/v1/admin/overview
  GET  /api/v1/admin/users
  PATCH /api/v1/admin/users/:id
  GET  /api/v1/admin/transfers
  GET  /api/v1/admin/audit
        │
        ▼
AdminService → Prisma aggregates + user/transfer lists
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| Separate `apps/admin` | Smaller attack surface than embedding ops UI in customer app |
| `AdminAuth` decorator | Centralizes JWT + `Role.ADMIN` enforcement |
| Activate/deactivate users | MVP ops control without full user edit surface |
| Audit on admin mutations | Compliance trail for account status changes |
| Reuse `/auth/login` | No parallel admin auth stack; role gate is enough |

## Database changes

Audit actions: `USER_ACTIVATED`, `USER_DEACTIVATED`

Migration: `20260718080000_admin_audit`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/overview` | Users / transfers / wallets / unread KPIs |
| GET | `/admin/users` | Paginated users (`q` search) |
| PATCH | `/admin/users/:id` | `{ isActive: boolean }` |
| GET | `/admin/transfers` | Platform-wide transfer list |
| GET | `/admin/audit` | Recent audit log |

All routes require `Authorization: Bearer` + `role=ADMIN`.

## Frontend (`apps/admin`)

| Route | Purpose |
|-------|---------|
| `/` | Admin login (rejects non-ADMIN) |
| `/overview` | KPI cards |
| `/users` | Search + activate/deactivate |
| `/transfers` | Status-filtered ledger of sends |
| `/audit` | Recent audit stream |

Seed credentials: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (see `.env.example`).

## Tests

- `AdminService` overview, list, activate/deactivate guards

## MVP complete

Features 1–10 delivered. Next work is hardening (KYC, real Circle live keys, email provider, BullMQ workers).
