# NairaFlow — Architecture

This document explains the system design and the key decisions behind it.

## 1. Goals

- **Production quality**: fully typed, tested, documented, and observable.
- **Security first**: defense in depth across auth, validation, and audit.
- **Modularity**: framework-agnostic domain logic, thin delivery layers.
- **Scalability**: stateless API, Redis-backed queues, horizontal-ready.

## 2. Monorepo topology

The repo uses **pnpm workspaces** + **Turborepo**. Turbo orchestrates task graphs
(`^build` ensures dependencies build first) and caches results.

```
apps/*       delivery mechanisms (HTTP, UI)
packages/*   reusable domain + infrastructure libraries
```

Dependency direction is strictly **apps → packages** and, within packages,
`shared` has no internal dependencies while `auth`, `blockchain`, and `database`
depend only on `shared`. This keeps the domain core free of framework concerns.

### Why source-consumed UI, compiled libraries?

- `packages/ui` is consumed by Next.js via `transpilePackages`, so it ships as
  source `.tsx` (fast iteration, no build step).
- `packages/{shared,auth,blockchain,database}` are compiled to CommonJS `dist/`
  because they are consumed by the NestJS (CommonJS) runtime.

## 3. The money model

Financial correctness demands exact arithmetic. We **never** use floating point
for balances:

- Amounts are stored as **BigInt minor units** (cents, kobo, micro-USDC).
- The `Money` value object (`packages/shared/src/money.ts`) parses, formats, and
  performs currency-safe arithmetic; `convert()` applies a scaled-integer
  exchange rate.
- Exchange rates are stored as Prisma `Decimal(24,8)`.
- BigInt values are serialized to strings at the API boundary
  (`serializeBigInts`) so responses remain valid JSON.

## 4. Transfer lifecycle

A cross-border transfer moves through an explicit state machine
(`TransferStatus`):

```
DRAFT → QUOTE_LOCKED → AWAITING_FUNDING → FUNDED
      → ON_CHAIN_PENDING → ON_CHAIN_CONFIRMED
      → PAYOUT_PENDING → COMPLETED
(any) → FAILED | REFUNDED | CANCELLED
```

Each transition is recorded and, where it moves value, produces immutable
**ledger `Transaction`** rows tied to a wallet (and the transfer). This gives a
double-entry-friendly, auditable history.

## 5. Authentication & authorization

- **Registration/login** issue an access + refresh pair
  (`@nairaflow/auth.issueTokenPair`).
- **Access tokens** are short-lived (`15m` default) and carry `sub`, `email`,
  `role`.
- **Refresh tokens** are long-lived, carry a rotation id (`jti`), and only their
  **SHA-256 hash** is persisted. On refresh we revoke the presented token and
  issue a new one (**rotation**), defeating replay — verified by the e2e suite.
- **Guards** run globally: `JwtAuthGuard` authenticates (bypassed by `@Public()`),
  then `RolesGuard` authorizes via `@Roles()` metadata and a role hierarchy
  (`ADMIN` ⊇ `USER`).

## 6. Cross-cutting concerns

- **Config**: `@nestjs/config` with a `class-validator` schema; the app fails
  fast on bad env.
- **Errors**: a shared `DomainError` taxonomy with stable machine codes, mapped
  to HTTP by `DomainExceptionFilter` into a consistent `ApiError` envelope.
- **Responses**: `ResponseInterceptor` wraps successes in `{ success, data }`.
- **Audit**: `AuditService` writes an append-only trail; failures never break the
  user-facing request.
- **Health**: `/api/health` probes Postgres and Redis.

## 7. Blockchain integration

`packages/blockchain` provides a typed, transport-injectable `CircleClient`
(programmable wallets / USDC transfers on Base) and BigInt-safe USDC unit
helpers. The client maps transport/HTTP failures to `UpstreamError`.

## 8. Data store

PostgreSQL via Prisma. The schema models every core module (users, refresh
tokens, KYC, wallets, balances, treasury, recipients, exchange rates, transfers,
on-chain transactions, ledger transactions, notifications, audit logs) with
appropriate indexes and cascade rules. Migrations are versioned under
`packages/database/prisma/migrations`.

## 9. Testing strategy

- **Unit** tests cover pure logic (Money, tokens, RBAC, Circle client, service
  logic with mocked Prisma).
- **E2E** tests boot the real Nest app against a test database and exercise the
  full auth flow, RBAC, validation, and refresh-token rotation/replay.

## 10. Deployment shape

- **API** → Railway (Docker), **web/admin** → Vercel, **Cloudflare** in front.
- Docker images are multi-stage; the API image applies `prisma migrate deploy`
  on boot. Local orchestration is provided by `docker-compose.yml`.
