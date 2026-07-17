# GMNY

> **Send Dollars. Receive Naira. Instantly.** — USDC-powered cross-border payments.

GMNY lets users in the United States send USD that settles as **USDC on Base**
and is delivered as **Nigerian Naira** directly into a recipient's bank account.

This repository is a production-oriented **monorepo** (pnpm + Turborepo) containing the
customer web app, admin console, API, and shared domain packages.

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Common commands](#common-commands)
- [Core modules](#core-modules)
- [Testing](#testing)
- [Security model](#security-model)
- [Documentation](#documentation)

---

## Architecture

GMNY follows **clean architecture** and **SOLID** principles with a clear separation
between framework-agnostic domain logic (the `packages/*`) and delivery mechanisms
(the `apps/*`). See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full write-up,
including the money model, the transfer lifecycle, and the double-entry ledger.

```
US sender ──USD──▶ GMNY API ──USDC (Base)──▶ Treasury ──NGN payout──▶ recipient bank
```

## Tech stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Frontend      | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Backend       | NestJS 11, PostgreSQL, Prisma, Redis, BullMQ            |
| Blockchain    | Base, USDC, Circle APIs                                 |
| Auth          | JWT access + rotating refresh tokens, RBAC (USER/ADMIN) |
| Tooling       | pnpm workspaces, Turborepo, Jest, ESLint, Prettier      |
| Infra         | Docker, GitHub Actions, Railway, Vercel, Cloudflare     |

## Repository layout

```
apps/
  web/        Next.js 15 customer app (landing, auth, dashboard)
  api/        NestJS API (auth, users, health, audit, …)
  admin/      Next.js 15 admin console (user management)
packages/
  ui/         Shared shadcn/ui component library
  database/   Prisma schema, generated client, migrations, seed
  auth/       Framework-agnostic password hashing + JWT + RBAC
  blockchain/ Typed Circle API client + USDC helpers
  shared/     Domain enums, errors, Money value object, pagination
```

## Prerequisites

- **Node.js ≥ 20** (22 recommended)
- **pnpm ≥ 9** (`corepack enable`)
- **PostgreSQL 16** and **Redis 7** — run natively or via `docker compose`

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start infra (or use a native Postgres/Redis)
docker compose up -d postgres redis

# 3. Configure environment
cp .env.example .env

# 4. Generate the Prisma client, apply migrations, and seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run everything in dev mode (api :4000, web :3000, admin :3001)
pnpm dev
```

Seeded accounts: `admin@gmny.io` / `Admin!12345` and `demo@gmny.io` / `Demo!12345`.

API docs (Swagger): http://localhost:4000/api/docs

## Environment variables

All variables are documented in [`.env.example`](.env.example). The API validates its
environment on boot (see `apps/api/src/config/env.validation.ts`) and refuses to start
if anything required is missing or malformed.

## Common commands

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Run all apps/packages in watch mode (Turbo)    |
| `pnpm build`        | Build every workspace                          |
| `pnpm lint`         | Lint every workspace                           |
| `pnpm test`         | Run unit tests across the monorepo             |
| `pnpm typecheck`    | Type-check without emitting                    |
| `pnpm db:migrate`   | Create + apply a Prisma migration (dev)        |
| `pnpm db:seed`      | Seed baseline data                             |
| `pnpm db:studio`    | Open Prisma Studio                             |

## Core modules

Authentication · Users · Wallets · Transfers · Transactions · Exchange Rates ·
Compliance (KYC) · Notifications · Admin Dashboard · Treasury · Audit Logs.

The database schema for **all** of these is defined in
[`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma). The
**Authentication**, **Users**, **Audit**, and **Health** modules are fully implemented in
this milestone; the remaining modules build on the same schema and patterns.

## Testing

- **Unit tests** live beside the code as `*.spec.ts` (shared, auth, blockchain, api).
- **E2E tests** for the API live in `apps/api/test/*.e2e-spec.ts` and run against a
  dedicated test database.

```bash
pnpm test                              # all unit tests
pnpm --filter @gmny/api test:e2e  # API end-to-end (needs test DB)
```

## Authentication

Production-grade auth lives in `apps/api` (module `modules/auth`) on top of the
framework-agnostic `@gmny/auth` package.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/register` | Create account (PENDING) + send verification email |
| POST | `/api/auth/login` | Authenticate → access token (body) + refresh cookie |
| POST | `/api/auth/refresh` | Rotate the httpOnly refresh cookie |
| POST | `/api/auth/logout` | Revoke current session + clear cookie |
| POST | `/api/auth/verify-email` | Verify email via emailed token |
| POST | `/api/auth/resend-verification` | Re-send the verification link |
| POST | `/api/auth/forgot-password` | Request a reset link (always 200) |
| POST | `/api/auth/reset-password` | Reset password + revoke all sessions |
| GET | `/api/auth/sessions` | List active sessions |
| DELETE | `/api/auth/sessions/:id` | Revoke a session |
| GET | `/api/auth/me` | Current principal |

Frontend pages (`apps/web`): `/register`, `/login`, `/verify-email`,
`/forgot-password`, `/reset-password`, and a protected `/dashboard`.

> **Dev tip:** when `NODE_ENV=development`, verification/reset responses include
> the action link (`devVerificationUrl` / `devActionUrl`) and the API logs the
> email body — so the whole flow is testable without a real inbox.

## Security model

- Passwords hashed with **Argon2id** (`@node-rs/argon2`, OWASP-aligned, tunable cost).
- **Short-lived access tokens** (body, held in memory) + **rotating, hashed refresh
  tokens** delivered as an **httpOnly / sameSite / path-scoped cookie** (replay-safe).
- **Email verification** and **password reset** via single-use, **hashed, expiring** tokens.
- **Rate limiting** (`@nestjs/throttler`) globally + stricter on credential/enumeration routes.
- **Anti-enumeration**: generic login errors + always-200 `forgot-password` + timing equalization.
- **RBAC** enforced globally via guards (`USER` / `ADMIN`, with a role hierarchy).
- **Helmet**, strict CORS allow-list, `cookie-parser`, and whitelisting `ValidationPipe` everywhere.
- **Append-only audit log** for every state-changing action.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design & decisions
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — workflow & conventions

## License

[MIT](LICENSE)
