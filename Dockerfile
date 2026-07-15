# ============================================================
# Jingga API — Railway Dockerfile (root)
# ============================================================
# Build context = repo root (DO NOT set Root Directory in Railway)
# Railway auto-detects this at the project root.
#
# Multi-stage build:
#   1. builder — install deps & build all packages
#   2. runner — production image
# ============================================================

# --------------- builder ---------------
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first (Docker layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src/

# Build shared → then api
RUN pnpm --filter @jingga/shared build
RUN pnpm --filter @jingga/api build

# --------------- runner ---------------
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration (required for pnpm workspace resolution)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package manifests for workspace packages
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist/
COPY --from=builder /app/apps/api/dist ./apps/api/dist/

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
