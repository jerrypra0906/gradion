# Multi-stage build — minimal apt deps (sharp uses prebuilt binaries; no libvips-dev)

FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

# Full deps for TypeScript compile
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Production deps only
FROM base AS prod-deps
ARG DATABASE_URL=postgresql://gradion_user:build_placeholder@127.0.0.1:5432/gradion?schema=public
WORKDIR /app
ENV DATABASE_URL=${DATABASE_URL}
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev \
  && npx prisma generate

# Compile TypeScript
FROM base AS builder
ARG DATABASE_URL=postgresql://gradion_user:build_placeholder@127.0.0.1:5432/gradion?schema=public
WORKDIR /app
ENV DATABASE_URL=${DATABASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate \
  && npm run build

# Final production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p uploads/banners uploads/cms uploads/videos \
  && chown -R nodejs:nodejs uploads

USER nodejs
EXPOSE 3000
CMD ["node", "dist/index.js"]
