# Banners: one SSR fetch → Pinia → page-filtered

Change summary for the carousel-banner rework across **`monkey-user-t3`** (frontend)
and **`monkey-user-api`** (backend), 2026-08-08.

Goal: call `/site/banners-new/carousel` **once**, during SSR, for **all** active
banners; keep them in Pinia; let each page pick its own by the banner's `page`
value. Formal records: `DECISIONS.md` **ADR-022** (frontend) and the API repo's
`DECISIONS.md` **ADR-009** (contract).

---

## 1. The problem

`BannerPreview.vue` both **fetched and rendered**. It called
`/site/banners-new/carousel?page=<key>` from its own `useAsyncData`, with
`watch: [() => props.page]`.

Because the component lives in `layouts/default.vue`, it **survives navigation** —
so the watch fired on every page change:

```
visit /          → request #1  (page=homepage)
click /casino    → request #2  (page=casino)     ← client-side, after hydration
click /slots     → request #3  (page=slot)
click /          → request #4  (page=homepage)   ← again, not cached
```

Two further defects:

- The `useAsyncData` key was the **constant** `"banners-carousel"` while the data
  varied by page, so each navigation overwrote the same payload entry.
- Fetching lived inside a presentation component, so nothing else could reuse it.

---

## 2. The flow now

```
                      SSR (app.vue, in the existing Promise.all)
                                    │
                    fetchBanners()  │  composables/useBanners.ts
                                    ▼
              GET /site/banners-new/carousel?page=all
                 (withServerCache 60s, host-namespaced)
                                    │
                        zod validate + normalize
                                    ▼
                     Pinia  stores/banner.ts   ← ONE source of truth
                                    │
                          SSR payload → hydration
                                    │
                     bannersByPage(key)  (filter + sort)
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        page="homepage"       page="casino"          page="slot" …
              └─────────────────────┼─────────────────────┘
                                    ▼
                    BannerPreview.vue  (render only)
```

Client-side navigation is now a **re-filter of hydrated state** — zero requests.

---

## 3. Backend changes — `monkey-user-api`

All **additive and backward compatible**. Omitting `page` still defaults to
`homepage`, so other consumers of this shared multi-tenant endpoint are
unaffected. Changing the *default* to `all` was rejected for that reason.

| File | Change |
| --- | --- |
| `src/services/site.services.ts` | `listBanners` selects `page` on every row; skips the page filter when `page === 'all'`; orders by `page` then `sort` |
| `src/validators/site.validator.ts` | `t.Literal('all')` added to the query union; `page: t.String()` added to the 200 response schema |
| `src/interfaces/site.interface.ts` | `page: string` added to `IBanner` |
| `DECISIONS.md` | ADR-009 |

`page` is returned on **every** read, not only `page=all`, so the row shape never
varies by query.

**No controller change was needed** — the cache key already interpolates `page`
(`site:banners-new:<type>:all` becomes its own entry), and the admin's existing
invalidation wildcard `site:banners-new:*` still covers it.

### Contract

```http
GET /api/site/banners-new/carousel?page=all
```
```jsonc
[
  { "page": "casino",   "mainUrl": "…", "overlayUrl": null, "mainUrlMobile": "…",
    "overlayUrlMobile": null, "aspectRatioDesktop": "1202/300",
    "aspectRatioMobile": "1202/300", "sort": 0 },
  { "page": "homepage", "mainUrl": "…mp4", "overlayUrl": "…png", /* … */ "sort": 0 }
]
```

Valid `page` values: `all` | `homepage` | `hot` | `slot` | `casino` | `sport` |
`mini` | `virtual`.

---

## 4. Frontend changes — `monkey-user-t3`

### New files

**`app/stores/banner.ts`** — Pinia setup-store, matching `stores/site.ts` style.

- `banners` — every active banner, all pages.
- `loaded` — true once the fetch resolves *including when it resolves empty*.
  This is what distinguishes "no banners" from "not fetched yet" and stops a
  second request.
- `setBanners(list)`.
- `bannersByPage(key)` — filter + sort. A record whose `page` matches nothing
  simply never renders, so a malformed value degrades by being hidden rather
  than shown on the wrong page.

Deliberately **not** cleared on logout (unlike the `site` store): public CMS
content, nothing user-specific to leak.

**`app/composables/useBanners.ts`** — `fetchBanners()`, modelled directly on the
existing `fetchSiteSettings`:

- Early-returns if `store.loaded` — idempotent.
- `withServerCache('banners-carousel-all:<hostname>', 60_000, …)`.
- `forwardHostHeaders()` so the multi-tenant backend resolves the right site on
  SSR (the raw `$fetch` bypasses the host-setting Nitro proxy).
- zod-validated via the existing `bannersCarouselResponseSchema`.
- On failure: stores `[]` and marks loaded, so the slot shows its empty state
  instead of retrying per page.

### Modified files

| File | Change |
| --- | --- |
| `app/app.vue` | `useAsyncData("banners", fetchBanners, { getCachedData })` added to the existing `Promise.all`. `getCachedData` is what prevents a refetch on hydration. |
| `app/components/banner/BannerPreview.vue` | Fetch and loading placeholder removed; reads the store. Also holds the previous creative until the incoming one has decoded — see §6a. |
| `app/interfaces/site.interface.ts` | `page` on the wire schema (optional — see below) and on `BannerCarouselItem` |
| `app/layouts/default.vue` | Comment corrected — the swap no longer refetches |
| `i18n/locales/{en,ko}.json` | `common.loadingBanners` removed (its only consumer is gone) |
| `KNOWLEDGEBASE.md` | SSR boot list, `withServerCache` users, stores table, File Reading Map row |
| `DECISIONS.md` | ADR-022 |

**Reused, not rebuilt:** `app/utils/pageBanner.ts` already mapped route → page
key (`BannerPageKey`), so no second mapping was introduced.

**Deploy-skew guard:** `page` is **optional** on the wire and maps to
`"homepage"` when absent, so a backend predating the field cannot fail zod
validation and blank the carousel.

---

## 5. Dead code

There was very little. Removed only after verifying references:

- The fetch block inside `BannerPreview.vue` (the point of the change).
- The `.is-loading` dim + loading placeholder — nothing to wait for any more.
- `common.loadingBanners` in both locale files — grepped to zero references first.

**Kept:** `BannerCard.vue` and `BannerPopup.vue` are live but belong to a
*different* endpoint (`/site/banners/popup`, already SSR-fetched correctly in the
layout). Out of scope, untouched.

---

## 6a. Flicker on page switch — found and fixed

Reported after the first cut: a flash when switching pages. Measured by sampling
the banner slot every animation frame across a navigation.

**Cause.** Having the *records* in memory is not the same as having the
*artwork* decoded. The `src` swapped the instant the route changed, and the
container is `bg-black`, so the slot painted **black until the new image
decoded**:

```
before:  t=194ms  src=casino.png  decoded=false   ← black starts
         t=538ms                  decoded=true    ← ~344ms of black
```

It only bit on the *first* visit to a page; a second visit hit the browser cache
and painted instantly. The earlier per-page fetch had masked this behind its
keep-previous-data dim, so removing the fetch is what exposed it.

**Fix** (both in `BannerPreview.vue`):

1. **Swap on decode.** `displayPage` lags `props.page` until the incoming
   creative has been through `image.decode()`, bounded by
   `SWAP_DECODE_BUDGET_MS` (600ms) so a slow CDN can't strand the visitor on the
   old banner. A faster subsequent navigation cancels a pending swap.
2. **Prewarm at idle.** The first banner of every *other* page is decoded on
   `requestIdleCallback`. No extra API requests — the set is already in the
   store — so the swap resolves instantly instead of spending its budget.

```
after:   t=195ms  src=casino.png  decoded=true    ← zero black frames
```

**Still present by design:** the ~300ms `aspect-ratio` glide when two pages'
banner ratios differ. That is deliberate animation (it replaced a hard snap),
not flicker. Say so if it should go.

## 6. Verification

Run against the **real local API** on `:5003` with the dev server on `:3000`.

**API**
- `?page=all` → `casino, homepage, hot, mini, slot, sport, virtual`, each tagged.
- No param → homepage only, now including `page` (backward compatible).

**Browser-side `/banners-new` requests: 0**, across two SSR loads and four
client-side navigations.

**Per-page filtering** (real link clicks, not router calls):

| Step | URL | Requests | Media |
| --- | --- | --- | --- |
| SSR load | `/` | 0 | homepage `.mp4` |
| click | `/casino` | 0 | casino `.png` |
| click | `/slots` | 0 | slot `.png` |
| click | `/` | 0 | homepage `.mp4` |
| click | `/casino` | 0 | casino `.png` |

**SSR** — raw server HTML (no browser JS) contains the banner slot and the
correct media per route, and both routes' HTML carry the whole set in the
payload: one fetch, all pages.

**Gate** — `test:component` 11/11; typecheck clean apart from the pre-existing
`nuxt.config.ts(194)` `"oxc"` error; `npm run build` complete. API: 123/123 unit
tests, typecheck and ESLint clean.

> Note: `test:component` intermittently fails with a 10s `setupNuxt` hook timeout
> on this machine. It is a pre-existing environment flake (both suites fail the
> same way on an unmodified tree) and passes on re-run.

---

## 7. Things to know

- **Deploy order matters.** The frontend requests `page=all`; an old backend
  rejects that value (422) and the carousel renders empty. **Ship the API first**,
  or together.
- **The SSR fetch is unconditional.** Pages with no banner slot (`/slot-rtp`,
  `/deposit`, …) still pay for it on a cold load. It is one 60s-cached,
  host-shared request, judged a better trade than reintroducing conditional
  fetching — easy to make lazy if preferred.
- **Adding a new banner page** means adding the key in three places: the DB/CMS
  value, the query union in `site.validator.ts`, and `ROUTE_TO_PAGE` in
  `app/utils/pageBanner.ts`.
- **Cache lag:** a banner edit takes up to 60s to appear (frontend
  `withServerCache`) on top of the backend's own `PUBLIC_READ_CACHE_TTL`.
