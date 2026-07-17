# ── NairaFlow API — multi-stage build ────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

# ── Install dependencies (cached on lockfile) ────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/auth/package.json packages/auth/
COPY packages/blockchain/package.json packages/blockchain/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @nairaflow/shared --filter @nairaflow/auth \
        --filter @nairaflow/blockchain --filter @nairaflow/database build \
 && pnpm --filter @nairaflow/api build \
 && pnpm --filter @nairaflow/api --prod deploy /out

# ── Runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/dist ./dist
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/packages/database/prisma ./prisma
EXPOSE 4000
# Apply pending migrations, then boot the API.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
