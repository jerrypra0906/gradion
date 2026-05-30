# Single-path build for small EC2 (avoids parallel npm ci + duplicate node_modules copies)

FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app

ARG DATABASE_URL=postgresql://gradion_user:build_placeholder@127.0.0.1:5432/gradion?schema=public
ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

# Install TypeScript temporarily for compile, then remove dev tooling
RUN npm install --no-save typescript@5.3.3 \
  && npx prisma generate \
  && npm run build \
  && npm uninstall typescript \
  && npm cache clean --force

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/package.json ./

RUN mkdir -p uploads/banners uploads/cms uploads/videos \
  && chown -R nodejs:nodejs uploads

USER nodejs
EXPOSE 3000
CMD ["node", "dist/index.js"]
