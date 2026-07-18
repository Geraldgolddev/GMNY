# GMNY

USDC-powered cross-border payments: **USD → USDC (Base) → NGN bank deposit**.

## Current milestone

**Feature 5 — Send Money** is complete. Next: Transaction History.  
See [docs/FEATURE_05_SEND_MONEY.md](docs/FEATURE_05_SEND_MONEY.md) and [docs/ROADMAP.md](docs/ROADMAP.md).





## Stack

- **Web:** Next.js + TypeScript + Tailwind (`apps/web`)
- **API:** NestJS (`apps/api`)
- **DB:** PostgreSQL + Prisma (`packages/database`)
- **Auth libs:** Argon2id + JWT helpers (`packages/auth`)
- **Infra:** Docker Compose (Postgres + Redis)

## Quick start

```bash
cp .env.example .env
docker compose up -d          # or local PostgreSQL on :5432
npm install
npm run build:packages
npm run db:migrate:deploy
npm run db:seed
npm run dev:api               # http://localhost:4000/docs
npm run dev:web               # http://localhost:3000
```

Seeded admin (change immediately): `admin@gmny.com` / `ChangeMeAdmin1!`

## Monorepo layout

```
apps/web      Customer app
apps/admin   Admin console (later features)
apps/api     NestJS API
packages/    shared, database, auth, blockchain, ui
docs/        architecture + per-feature docs
```
