# Single-path build for small EC2 (full npm ci for compile, prune dev deps after)

FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app

ARG DATABASE_URL=postgresql://gradion_user:build_placeholder@127.0.0.1:5432/gradion?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate \
  && npm run build \
  && npx tsc -p tsconfig.seed.json \
  && npm prune --omit=dev \
  && npm cache clean --force

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Use the image's default `node` user (uid 1000) — matches typical EC2 `ubuntu` for bind mounts.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/package.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p uploads/banners uploads/cms uploads/videos logs \
  && chown -R node:node uploads logs docker-entrypoint.sh

# Entrypoint starts as root to chown bind-mounted uploads/logs, then drops to `node`.
USER root
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
