# AGENTS.md

GMNY is a **pnpm + Turborepo monorepo** (`apps/*`, `packages/*`). Node ≥ 20, pnpm ≥ 9.
Standard commands live in the root `package.json` and each package's `package.json`; see
`README.md` and `docs/ARCHITECTURE.md` for the full picture.

## Cursor Cloud specific instructions

### Services required
The API needs **PostgreSQL 16** and **Redis 7**. In this environment they are installed
**natively** (not via Docker) and are **not** managed by systemd, so start them manually:

```bash
sudo pg_ctlcluster 16 main start        # start PostgreSQL
sudo redis-server --daemonize yes       # start Redis
```

If a fresh VM does not have them installed yet (the update script intentionally does not
install system packages), install once with:

```bash
sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib redis-server
```

Then create the role + databases (idempotent):

```bash
sudo -u postgres psql -c "CREATE ROLE gmny LOGIN PASSWORD 'gmny' CREATEDB;" 2>/dev/null || true
sudo -u postgres createdb -O gmny gmny 2>/dev/null || true
sudo -u postgres createdb -O gmny gmny_test 2>/dev/null || true
```

### Environment file (non-obvious)
- Copy `.env.example` → `.env` at the repo root (it is git-ignored). The API validates its
  environment on boot and **refuses to start** if anything required is missing.
- **Prisma does NOT auto-load the root `.env`.** Prisma CLI commands run inside
  `packages/database`, so `DATABASE_URL` must be present in that process. Either export it
  inline or run migrations like:
  ```bash
  cd packages/database && DATABASE_URL="postgresql://gmny:gmny@127.0.0.1:5432/gmny?schema=public" pnpm exec prisma migrate deploy
  ```

### Running things
- `pnpm dev` runs **all** apps (api :4000, web :3000, admin :3001). Use
  `pnpm --filter @gmny/api dev` etc. to run one. Swagger: `http://localhost:4000/api/docs`.
- Seeded logins after `pnpm db:seed`: `admin@gmny.io` / `Admin!12345`,
  `demo@gmny.io` / `Demo!12345`.

### Package build model (important gotcha)
- `packages/{shared,auth,blockchain,database}` are **compiled to `dist/`** and consumed by
  the NestJS runtime. The NestJS `--watch` dev server does **not** rebuild sibling packages —
  after editing one of these packages you must rebuild it (`pnpm --filter <pkg> build`) for
  the API to pick up the change.
- `packages/ui` is consumed as **source** by Next.js via `transpilePackages` (no build step;
  edits hot-reload in web/admin).
- Run `pnpm db:generate` after installing/altering the schema so the Prisma client exists
  (the root `pnpm build` and the update script already do this).
- **Do not run the production `pnpm build` (or `next build`) while a `next dev` server is
  running** — both write to the same `apps/*/.next` directory, which corrupts the dev
  server and causes `MODULE_NOT_FOUND` / HTTP 500s. If this happens, stop the dev server,
  delete that app's `.next`, and restart `pnpm dev`.

### Tests
- Unit: `pnpm test` (Turbo, all packages).
- API e2e boots the real app against the **test** database — point `DATABASE_URL` at
  `gmny_test` (already migrated) and provide JWT secrets, e.g.:
  ```bash
  cd apps/api && NODE_ENV=test \
    DATABASE_URL="postgresql://gmny:gmny@127.0.0.1:5432/gmny_test?schema=public" \
    REDIS_URL="redis://127.0.0.1:6379" \
    JWT_ACCESS_SECRET="test-access-secret-000000000000" \
    JWT_REFRESH_SECRET="test-refresh-secret-11111111111" \
    COOKIE_SECRET="test-cookie-secret-00000000000000" \
    ARGON2_MEMORY_COST=8 ARGON2_TIME_COST=1 ARGON2_PARALLELISM=1 \
    THROTTLE_LIMIT=1000 pnpm test:e2e
  ```
  Use low `ARGON2_*` costs in tests for speed, and a high `THROTTLE_LIMIT` so the
  global limiter doesn't interfere (the strict per-route `@Throttle` still applies).
- Passwords use **Argon2id** via `@node-rs/argon2` (prebuilt binaries — no native
  build toolchain needed). The refresh token is delivered as an httpOnly cookie
  (`gmny_refresh`, path `/api/auth`); e2e must set the global prefix to `api` and use
  `cookie-parser` so the cookie path matches (see `apps/api/test/auth.e2e-spec.ts`).
