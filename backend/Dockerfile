# Multi-stage build for production optimization
FROM node:20-bullseye-slim AS base

# Install required system libraries (OpenSSL 1.1 for Prisma, libvips for sharp)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    wget \
    libvips-dev \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install --production=false

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Prisma 7 loads prisma.config.ts during `generate` and requires DATABASE_URL to be set.
# Use a placeholder at build time; runtime gets the real URL from docker-compose / orchestrator.
# Override with: docker compose build --build-arg DATABASE_URL=...
ARG DATABASE_URL=postgresql://gradion_user:build_placeholder@127.0.0.1:5432/gradion?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts* ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts ./scripts

# Create uploads directory with banners subdirectory
RUN mkdir -p uploads/banners && chown -R nodejs:nodejs uploads

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]

