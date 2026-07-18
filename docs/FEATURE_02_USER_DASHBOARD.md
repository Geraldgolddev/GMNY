# Feature 2 — User Dashboard

## Architecture

```
Browser (/dashboard)
    │ Bearer access token
    ▼
NestJS DashboardModule
    GET /api/v1/dashboard/overview
    │
    ├─ users          (profile, last login, role, status)
    └─ audit_logs     (recent auth events for this actor)
```

### Design decisions

| Choice | Rationale |
|--------|-----------|
| Dedicated `/dashboard/overview` (not only `/auth/me`) | Keeps auth identity endpoint slim; dashboard can grow (balances, transfer counts) without overloading auth |
| Read from `audit_logs` | Real security activity — no fabricated “stats” |
| App shell on the web | Consistent GMNY blue chrome for upcoming recipient/send/history routes |
| No new tables | Feature stays additive; recipients/transfers arrive in later features |

## Database changes

**None.** Uses Feature 1 tables:

- `users` — greeting, role, status, `last_login_at`, `created_at`
- `audit_logs` — last 8 auth-related actions for the signed-in user

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/dashboard/overview` | Bearer | Profile + account + recent security events |

## Frontend

- `/dashboard` — authenticated overview (blue theme)
- `AppShell` — brand header + nav + sign out

## Tests

- `DashboardService` unit tests: happy path + inactive user rejection

## Next feature

**Feature 3 — Recipient Management** (Nigerian bank recipients CRUD).
