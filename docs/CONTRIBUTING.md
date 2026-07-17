# Contributing to GMNY

Thanks for contributing! This guide covers local setup and the conventions we follow.

## Development setup

See the [Quick start](../README.md#quick-start) in the README. In short:

```bash
pnpm install
docker compose up -d postgres redis   # or a native Postgres/Redis
cp .env.example .env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

## Conventions

- **Language**: TypeScript everywhere, `strict` mode on.
- **Formatting**: Prettier (`pnpm format`); **linting**: ESLint (`pnpm lint`).
- **Commits**: use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`). Each commit should
  represent a production-quality, self-contained milestone.
- **Tests**: add/extend `*.spec.ts` next to the code you change. API behavior
  that spans modules should get an `*.e2e-spec.ts`.

## Feature workflow

For each feature we follow a fixed sequence:

1. Explain the design.
2. Design the database schema (Prisma migration).
3. Implement the backend (NestJS module: controller + service + DTOs + guards).
4. Implement the frontend.
5. Add tests (unit + e2e).
6. Update documentation.

Every API endpoint must have **validation**, **error handling**, and **Swagger**
documentation. Every UI component should be reusable and live in `packages/ui`
when shared.

## Database changes

```bash
# edit packages/database/prisma/schema.prisma, then:
pnpm db:migrate      # creates a named migration and applies it locally
```

Never edit an already-applied migration; create a new one.

## Before opening a PR

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @gmny/api test:e2e   # requires the test database
```
