# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# banana-lucky-nuxt — production image
#
# Build:
#   docker build -t banana-lucky-nuxt .
#   docker build --build-arg NUXT_PUBLIC_SITE=lucky -t banana-lucky-nuxt:lucky .
#
# Run (behind Traefik on the VPS):
#   docker run --rm -p 3000:3000 \
#     -e NUXT_PUBLIC_SITE=lucky \
#     -e NUXT_PUBLIC_SITE_URL=https://luckylah.com \
#     -e NUXT_API_URL=https://api.example.internal/api \
#     -e NUXT_WS_API_URL=ws://api.example.internal:4002 \
#     -e REDIS_HOST=redis -e REDIS_PORT=6379 -e REDIS_PASSWORD= -e REDIS_DB=0 \
#     banana-lucky-nuxt
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
# NUXT_PUBLIC_SITE is consumed at build time by Vite's `define` (drives the
# __BUILD_SITE__ tree-shake) and by the <title>/<meta>/<script> head config in
# nuxt.config.ts. Pin the brand here to ship a smaller bundle.
# Valid: lucky | ocean | tiger | dragon | rabbit | green |
#        space | egypt | ant | frankenstein | bird
# Empty string ("") keeps all 11 brand configs in the bundle and dispatches by
# hostname at runtime (dev/preview only — not recommended for prod).
ARG NUXT_PUBLIC_SITE=""
ENV NUXT_PUBLIC_SITE=${NUXT_PUBLIC_SITE}
RUN bun run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NITRO_PORT=3000
ENV HOST=0.0.0.0
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
