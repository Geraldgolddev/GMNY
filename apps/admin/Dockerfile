# ── GMNY Admin (Next.js 15) — multi-stage build ─────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @gmny/admin build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3001
CMD ["pnpm", "--filter", "@gmny/admin", "start"]
