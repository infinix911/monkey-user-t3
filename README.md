# monkey-user-t3

Nuxt 4 / Vue 3 member frontend with CMS-driven themes. Public pages use SSR with ten-minute caching; member REST/WebSocket requests run in the browser.

## Development and checks

Use Node 24 (`nvm use`), run `npm ci`, and copy `.env.example` to `.env`. Local API requests use `NUXT_PUBLIC_API_BASE` (default `http://localhost:5003/api`); deployed hosts derive the sibling `uapi.<root-domain>` API at runtime.

```bash
npm run dev
npm run test:component
npm run test:worker
npm run typecheck
npm run lint
npm run build
npm run start
```

`build` / `start` retain the Node server workflow. Playwright feature tests require an app at `http://localhost:3000`; install Chromium with `npx playwright install chromium`. Use `npx playwright test --list` to check discovery. The performance suite uses `PERF_BASE_URL`; set it explicitly before running `npm run test:e2e:perf`.

## Cloudflare public SSR and cache refresh

```bash
npm run dev
bun run build
bun run verify:cf-build
bun run deploy:cf
```

The production build contains a Nuxt Cloudflare-module renderer and public assets.
`index.js` exports the uncached gateway and cached `Shell` from `worker/userpage.ts`.
`generate` also builds the SSR renderer; it no longer generates a static SPA.
`npm run start` runs Wrangler locally. For a Node deployment, build with
`NITRO_PRESET=node-server` and run `node .output/server/index.mjs` directly.

Public themes, scripts, settings, banners and catalogues resolve during SSR and
hydrate from the Nuxt/Pinia payload. Member credentials are stripped during SSR;
session, wallet and member-filtered catalogue updates run in the browser. No
hostname-only theme localStorage warm start or duplicate theme prefetch runs.
Existing preview and game-launch behavior remain supported.

The `Shell` caches successful public HTML for 600 seconds. The gateway varies
its props by hostname, route, supported pagination, locale and mobile/desktop.
Browser HTML revalidates; previews, errors, degraded responses, `Set-Cookie`,
private responses and credential-bearing requests bypass shared caching.
KV remains removed. No Redis connection or Cloudflare credentials enter Nuxt.

Set `USERPAGE_CACHE_PURGE_SECRET` with `wrangler secret put` in every Worker,
matching the admin API value (at least 32 characters). Optional Worker variable
`NUXT_ALLOWED_HOSTS` restricts deployed hosts; API CORS origins and `SITE_GROUPS`
must include the public domains. Admin and user API must share their Redis
`SITE_CODE` namespace. The API emits `X-Userpage-Cache-Tag`; SSR carries it onto
cached HTML as a deployment/group-specific tag.

Admin Save and Push persist `userpage_theme_config`, clear Redis, then call
`POST /__internal/userpage-cache/purge` with the matching bearer secret and
`{ "tag": "userpage-<SITE_CODE>:<templateId>" }`. Public CMS edits refresh all
configured groups. Purge failures preserve the save and expose a retry warning;
cache expiry is the fallback. Preview and unsaved uploads do not purge live data.

```bash
npm run test:worker
npm run test:component
npm run test:e2e:theme
```

The generated-renderer suite requires a production build and Chromium, starts a
local Worker harness, and mocks all API traffic. Local emulation does not prove
native cache hits or distributed purge; check those in a remote preview before
rollout. Keep `public/_headers`, both lockfiles, and existing R2 asset settings.

## Public R2 assets

Set `R2_PUBLIC_BASE_URL=https://assets.fr-7979.com` in the build environment. This is the public
custom-domain origin without a bucket name or path; a trailing slash is
normalized. Asset URLs and resource hints use this origin. Rebuild the SPA when
it changes. Never put R2 access keys or secrets in frontend environment files.
Committed theme examples use `https://assets.fr-7979.com`; existing CMS URLs and object migration
remain a manual cutover task.
