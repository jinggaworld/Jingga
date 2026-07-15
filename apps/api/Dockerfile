# ============================================================
# Jingga API — Railway Dockerfile
# ============================================================
# Multi-stage build:
#   1. builder — install deps & build all packages
#   2. runner — production image (MUST keep workspace structure
#      so dotenv & path.resolve(process.cwd(), 'apps/api/.env') resolve)

# --------------- builder ---------------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first (Docker layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/src ./packages/shared/src/
COPY apps/api/src ./apps/api/src/
COPY apps/api/tsconfig.json ./apps/api/

# Build shared → then api
RUN pnpm --filter @jingga/shared build
RUN pnpm --filter @jingga/api build

# --------------- runner ---------------
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration (required for pnpm workspace resolution)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package manifests for workspace packages
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install only production dependencies (pnpm still resolves workspace:*
# links correctly from the copied manifests + dist/ below)
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist/
COPY --from=builder /app/apps/api/dist ./apps/api/dist/

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
