# GMNY MVP Roadmap

Production-quality MVP for U.S.→Nigeria remittances settling in USDC on Base.

## Delivery order (one feature at a time)

| # | Feature | Status |
|---|---------|--------|
| 1 | Authentication (JWT + refresh + RBAC + audit) | Done |
| 2 | User Dashboard | Done |
| 3 | Recipient Management | Done |
| 4 | Live USD/NGN Exchange Rate | Done |
| 5 | Send Money | Done |
| 6 | Transaction History | Done |
| 7 | Circle Sandbox Integration | Done |
| 8 | Base Network Integration | Done |
| 9 | Notifications | Done |
| 10 | Admin Dashboard | **Done** |

## Platform (ongoing)

- Monorepo (`apps/*`, `packages/*`)
- Docker Compose (PostgreSQL 16 + Redis 7)
- Prisma migrations
- Next.js web + NestJS API
- Blue brand theme ([BRAND.md](./BRAND.md))
- CI on GitHub Actions

## Process per feature

1. Explain architecture  
2. Design database changes  
3. Production-ready code  
4. Tests  
5. Documentation update  
