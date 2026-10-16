# monkey-user-t3

Nuxt 4 / Vue 3 member frontend with CMS-driven themes. The app is a client-rendered SPA (`ssr: false`) that calls the public member API directly with credentialed REST/WebSocket requests.

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

## Cloudflare CMS HTML bootstrap

Keep `bun.lock` in version 1 format for Cloudflare builds using Bun 1.2.15. Update it with `npx --yes bun@1.2.15 install` when dependencies change.

```bash
bun run generate
bun run verify:cf-build
bun run test:e2e:bootstrap
bun run deploy:cf
```

Cloudflare deployment uses `wrangler.jsonc`, the `index.js` entrypoint, `worker/userpage.ts`, and `public/_headers`. Set `CLOUDFLARE_USERPAGE_KV_NAMESPACE_ID` to the existing namespace used by the admin API. The deploy wrapper binds that namespace and refuses to provision a replacement. The updated admin API must publish owned `domain:<hostname>` records and `bootstrap:<siteCode>` snapshots before Worker deployment; the legacy shared `site-groups` map is ignored.

The Worker resolves the closest configured hostname or parent suffix, validates its snapshot, and embeds the theme and trusted admin inline scripts before any static head script. The client plugin seeds Pinia/Nuxt config before rendering and marks scripts already injected. Healthy visits make no browser theme/custom-script requests. A published null theme loads bundled defaults and clears stale theme warm-cache data. Site settings, banners, and session data still load through their existing browser APIs.

Multiple independent publishers can share the namespace; publisher identities, configured domains, and site codes must have unique ownership. Hostname-only shells exclude cookies, paths, and query strings, use native `Shell` entrypoint caching for 300 seconds, and tag responses by site code. KV reads cache for 60 seconds; changes may require propagation and shell TTL expiry.

Configure `USERPAGE_CACHE_PURGE_SECRET` as a Worker secret with Wrangler, matching the admin API value and at least 32 characters. The authenticated POST `/__internal/userpage-cache/purge` accepts `{ "siteCode": "example" }` or `{ "all": true }`. Purge failures are advisory to the admin publisher; published KV remains intact. Never expose the secret through public runtime config or HTML.

Local development, `?themePreview=1`, missing bindings/mappings/snapshots, or malformed data use the existing static shell and browser API fallback. Preview continues fetching `domain=preview` without live scripts. CMS theme fields retain this template's merge contract and bundled design; icons remain CMS-only with no added static fallback assets. Only inline script bodies and plain JS are supported, preserving the trusted-admin model.

The generated-shell browser suite starts its own local Worker harness and intercepts all external requests; it requires generated HTML and Chromium. Native Cloudflare cache and purge behavior also require remote validation. See `KNOWLEDGEBASE.md` for the feature map and `DECISIONS.md` for design rationale. Keep npm and Bun lockfiles synchronized when dependencies change.

## Public R2 assets

Set `R2_PUBLIC_BASE_URL=https://assets.fr-7979.com` in the build environment. This is the public
custom-domain origin without a bucket name or path; a trailing slash is
normalized. Asset URLs and resource hints use this origin. Rebuild the SPA when
it changes. Never put R2 access keys or secrets in frontend environment files.
Committed theme examples use `https://assets.fr-7979.com`; existing CMS URLs and object migration
remain a manual cutover task.
