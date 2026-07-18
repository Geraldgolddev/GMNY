# Feature 1 — Authentication

## Architecture

GMNY uses a modular monorepo:

```
apps/web     → Next.js customer UI (register / login / dashboard shell)
apps/api     → NestJS HTTP API (`/api/v1/auth/*`)
packages/auth     → Argon2id password hashing + HS256 JWT + refresh token hashing
packages/database → Prisma schema + migrations (PostgreSQL)
packages/shared   → Shared auth response types / roles
```

### Auth flow

1. **Register / Login** — API validates input, hashes password with Argon2id, issues:
   - short-lived **access JWT** (Bearer header)
   - opaque **refresh token** (stored as SHA-256 hash in `refresh_tokens`)
2. **Protected routes** — `AuthGuard` verifies access JWT signature + expiry.
3. **Refresh** — old refresh row is revoked; a new pair is issued (rotation).
4. **Logout** — revokes one refresh token or all sessions for the user.
5. **Audit** — register/login/refresh/logout write `audit_logs`.

### Security choices

| Decision | Why |
|----------|-----|
| Argon2id | Memory-hard; preferred over bcrypt for new systems |
| Opaque refresh + hashed at rest | Stolen DB rows cannot be replayed as tokens |
| Refresh rotation | Limits replay window if a refresh token leaks |
| Generic login errors | Avoids email enumeration |
| Strong password policy | 12+ chars, upper/lower/number/symbol |
| RBAC role on JWT (`USER`/`ADMIN`) | Ready for admin routes without redesign |

## Database changes

Tables introduced for Feature 1:

### `users`
Identity + credentials + role (`USER` \| `ADMIN`).

### `refresh_tokens`
Session store keyed by `token_hash` (SHA-256 of the opaque token). Supports revoke + expiry.

### `audit_logs`
Append-only auth event trail (`USER_REGISTERED`, `USER_LOGIN`, `USER_LOGOUT`, `TOKEN_REFRESHED`).

Migration: `packages/database/prisma/migrations/20260718010000_auth_foundation`.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Create USER account |
| POST | `/api/v1/auth/login` | Public | Issue tokens |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke session(s) |
| GET | `/api/v1/auth/me` | Bearer | Current user profile |
| GET | `/api/v1/health` | Public | Liveness + DB check |

OpenAPI: `http://localhost:4000/docs`

## Frontend

- `/register`, `/login` — auth forms
- `/dashboard` — authenticated shell (Feature 2 expands this)

## Tests

- `@gmny/auth` unit tests: password + token hashing
- `@gmny/api` unit tests: `AuthService` register/login paths

## Next feature

**Feature 2 — User Dashboard** (overview shell, empty states for recipients/transfers).
