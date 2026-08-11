FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall runs `prisma generate` — happens here, inside the target
# platform's container, so the query-engine binary matches (alpine/musl).
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/generated ./lib/generated
COPY . .
# .env is intentionally not copied into the image (see .dockerignore) — the
# real values are injected at container runtime via docker-compose. `next
# build` still evaluates every route module (including the Prisma client
# singleton) to determine static vs. dynamic rendering, so these build-only
# placeholders just need to be well-formed, not correct.
ENV DATABASE_URL="file:./build-placeholder.db"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY docker-entrypoint.sh ./

# /data is where the "app-data" volume mounts (see docker-compose.yml) — must
# already exist with the right owner in the image, or Docker creates it as
# root on first mount and the non-root nextjs user can't write the DB file.
RUN mkdir -p /data && chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app /data

USER nextjs
EXPOSE 3300
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
