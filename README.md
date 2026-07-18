# GMNY

Production-oriented USDC cross-border payments platform: **USD → USDC (Base) → NGN bank deposit**.

Product mission formerly scoped as NairaFlow; brand is **GMNY**.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DATABASE.md](docs/DATABASE.md).

```
apps/web      Customer Next.js app
apps/admin   Admin Next.js console
apps/api     NestJS API
packages/*   shared, database, auth, blockchain, ui
```

## Prerequisites

- Node.js 20+
- Docker Desktop (PostgreSQL + Redis)
- npm 10+

## Quick start

```bash
cp .env.example .env
docker compose up -d
npm install
npm run build:packages
npm run db:migrate:deploy
npm run db:seed
npm run dev:api
# separate terminals
npm run dev:web
npm run dev:admin
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/docs |

Default seeded admin: `admin@gmny.com` / `ChangeMeAdmin1!` (override via `SEED_ADMIN_*`).

## Phase 1 deliverables

- [x] Scalable npm workspaces monorepo
- [x] Docker Compose (Postgres 16 + Redis 7)
- [x] Environment validation
- [x] Prisma schema + initial migration for core domains
- [x] JWT access + hashed refresh tokens + RBAC (`USER` / `ADMIN`)
- [x] Audit logging for auth events
- [x] Web auth UI + admin console shell
- [x] Unit tests for auth primitives and auth service
- [x] OpenAPI documentation

## Testing

```bash
npm run test -w @gmny/shared
npm run test -w @gmny/auth
npm run test -w @gmny/blockchain
npm run test -w @gmny/api
```

## Security notes

- Never commit `.env`
- Rotate `JWT_*_SECRET` and seed admin password before any shared environment
- Circle credentials are unused until Phase 2 and fail closed via blockchain ports
