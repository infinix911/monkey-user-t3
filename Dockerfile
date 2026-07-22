# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# monkey-user-t3 — production image
#
# Build:
#   docker build -t monkey-user-t3 .
#
# Run (behind Traefik on the VPS):
#   docker run --rm -p 3000:3000 \
#     -e NUXT_API_URL=http://api:4000/api \
#     -e NUXT_WS_API_URL=ws://api:4000 \
#     -e REDIS_HOST=redis -e REDIS_PORT=6379 -e REDIS_PASSWORD= -e REDIS_DB=0 \
#     monkey-user-t3
#
# NUXT_API_URL and NUXT_WS_API_URL are resolved by Nitro only at container
# start. They are never exposed to the browser: requests remain same-origin
# /api and /ws and are forwarded by Nuxt's server-side proxies.
#
# REDIS_* are OPTIONAL and runtime-only (point at the same Redis as the backend
# for a shared, restart-surviving SSR cache). Without them the SSR cache falls
# back to in-process memory. Set NUXT_ENABLE_ANON_PAGE_CACHE=true to also cache
# anonymous full-page renders.
# -----------------------------------------------------------------------------

# Dependencies are installed with Bun against the tracked bun.lock (the repo
# switched off package-lock.json). --frozen-lockfile fails the build if the
# lockfile is out of date, keeping images reproducible.
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NITRO_PORT=3000
ENV HOST=0.0.0.0
COPY --chown=node:node --from=build /app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD host="${NUXT_ALLOWED_HOSTS%%,*}"; test -n "$host" && wget -q -O /dev/null --header="Host: $host" http://127.0.0.1:3000/health
CMD ["node", ".output/server/index.mjs"]
