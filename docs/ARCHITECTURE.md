# GMNY Architecture

GMNY is a USDC-powered U.S.→Nigeria cross-border payments platform (product mission formerly scoped as NairaFlow). Users send USD that settles as USDC on Base and is paid out as NGN to a Nigerian bank account.

## Design principles

1. **Security first** — secrets never in source; passwords hashed with Argon2id; refresh tokens stored hashed; RBAC on every protected route; audit logging for sensitive actions.
2. **Modular monorepo** — deployable apps depend on versioned internal packages; domain logic is not duplicated across apps.
3. **Clean architecture** — NestJS modules expose controllers → application services → infrastructure adapters. Packages define shared contracts (types, Zod schemas, Prisma).
4. **Fully typed** — TypeScript strict mode across apps and packages; request/response DTOs validated at the boundary.
5. **Testable** — domain services are injectable; Prisma and external APIs sit behind ports/adapters.

## Monorepo layout

```
apps/
  web/          Customer-facing Next.js app (Vercel)
  api/          NestJS HTTP API (Railway)
  admin/        Admin Next.js console (Vercel)
packages/
  shared/       Cross-cutting types, enums, Zod schemas, constants
  database/     Prisma schema, migrations, generated client
  auth/         Password hashing, token hashing, JWT claim types
  blockchain/   Circle / Base / USDC ports (adapters wired in later phases)
  ui/           Shared React UI primitives (Tailwind)
```

## Runtime topology

```
Browser (web/admin)
    │ HTTPS (Cloudflare)
    ▼
Next.js apps ──JWT──► NestJS API
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
       PostgreSQL      Redis       Circle APIs
       (Prisma)       (BullMQ)     (Base / USDC)
```

## Auth model

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access JWT | 15m | Client memory / Authorization header | API authorization |
| Refresh token | 7d | HttpOnly cookie (web) + hashed row in DB | Session renewal / revoke |

Roles: `USER`, `ADMIN`. Guards enforce role membership after JWT validation.

## Data ownership

`packages/database` is the single source of truth for the schema. Apps never define parallel schemas. Migrations are applied via Prisma Migrate from the database package.

## Phase boundaries

| Phase | Scope |
|-------|--------|
| **1 (this milestone)** | Monorepo, Docker, env, Prisma schema, JWT auth + RBAC, health, docs, tests |
| 2 | Circle wallets, USDC on Base, transfer engine |
| 3 | Nigerian payout, FX, notifications |
| 4 | Full KYC/AML, monitoring, production hardening |

## Why these choices

- **NestJS** — first-class DI, guards, interceptors, and module boundaries map cleanly to fintech domains.
- **Prisma** — typed queries, migration history, strong fit for PostgreSQL compliance data.
- **Redis + BullMQ** — durable async work (payouts, webhooks, notifications) without blocking request threads.
- **Separate admin app** — smaller attack surface and independent deploy/auth policies from the customer app.
- **Internal packages** — shared validation and types prevent API/UI drift.
