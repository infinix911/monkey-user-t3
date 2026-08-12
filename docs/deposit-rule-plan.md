# Deposit Rule — CMS-managed content for the Deposit modal

**Status:** analysis + plan only. No code changed.
**Date:** 2026-08-12
**Repos touched:** `monkey-admin`, `monkey-user-t3`. (`monkey-admin-api`: none, under the recommended option.)

---

## 1. Requirement as stated

- Add a **"Deposit Rule"** menu in the Admin CMS, **after "Notices"**.
- It should use the **same content management functionality as `/cms/notices`**.
- Its content displays in the **bank account information card in the user page's Deposit modal**.
- The content should **also be saved in Site Config**, so the user page reads it from site configuration.

---

## 2. How `/cms/notices` actually works today

| Layer | File | Role |
| --- | --- | --- |
| Nav | `monkey-admin/app/config/navigation.ts:326` | `cms-notices` child under `cms-manage` |
| Page | `monkey-admin/app/pages/(app)/cms/notices/index.vue` | `LayoutPageHeader` + `UCard` + enabled `USwitch` + `FormRichTextEditor` + dirty-gated Save |
| Composable | `monkey-admin/app/composables/useCmsNotice.ts` | Owns **content** and the **enabled** flag; one `load`/`save`/`dirty` over two storages |
| API module | `monkey-admin/app/api/cms-notice.ts` | `GET` / `PATCH /cms/user-notice` |
| Backend | `monkey-admin-api/src/routes/cmscontent.route.ts:106` | → `CmsContentController.getUserNotice` / `saveUserNotice` |
| Storage | `cmsUserNotice` table | Single row, upsert on `scope: 'default'`; then `invalidate("site:notice")` |
| User page read | `monkey-user-api` `GET /site/notice` | Consumed by `stores/ui.ts` → `NoticeSection.vue` |

### Key finding

Notices is a **hybrid**, and this matters:

- The rich-text **body** lives in its **own table**, behind its **own endpoint**. It is **NOT** in Site Config.
- Only the **on/off flag** lives in the theme document, at `theme.noticeModal.enabled`, written through
  `useThemeEditor.saveCategory('noticeModal', ['theme.noticeModal.enabled'])`.

So "same functionality as `/cms/notices`" and "saved in Site Config" point at two different storage
mechanisms. They have to be reconciled — see §4.

Precedent worth noting: `useCmsNotice` already demonstrates that **CMS-authored values can live in the
theme document** and be saved with an overlay-and-PUT that leaves other categories untouched.

---

## 3. Where the content has to surface on the user page

**File:** `monkey-user-t3/app/components/transaction/BankPaymentContent.vue`, the "Account Info Card"
(≈ lines 34–58).

Current contents of that card:

```
🏦  {{ user.bank_name || "—" }}
    {{ user.bank_account_name }}
    {{ user.bank_account | grouped in 4s }}
```

Those values come from `authStore.user` — i.e. **the member's own bank details**, not a
site/company account. See open question Q1; this is the single biggest ambiguity in the request.

### Site Config plumbing on the user page

- `useSiteConfig()` deep-merges the `/site/config/theme` payload onto `getDefaultThemeConfig()`.
- **Paths not present in the typed default are silently ignored.** A shape mismatch between the two
  repos produces no error — the value just never appears. This is the main failure mode to avoid.
- Authoritative field map: `monkey-user-t3/app/composables/useDefaultThemeConfig.ts`.
- Admin's mirror of the same schema: `monkey-admin/app/theme-schema/site-config.ts`.

### Rendering HTML on the user page (existing precedent)

- `renderRichContent` from `~/composables/useTiptap` — used by `NoticeSection.vue:103`.
- `renderTiptap` — used by `FaqContent.vue:64`.
- `sanitizeHtml` — `app/utils/sanitizeHtml.ts:158`.
- Convention: `v-html` with an `eslint-disable-next-line vue/no-v-html` comment. **Sanitize at the
  render boundary, never at the API boundary.**

---

## 4. Storage decision

### Option A — mirror Notices exactly (own table + endpoint), plus a Site Config copy

- Faithful to "same functionality as /cms/notices".
- Requires: new table, migration, controller, routes, validator, cache invalidation in
  `monkey-admin-api`; plus a second write into the theme doc.
- **Two sources of truth that must stay in sync.** Rejected — buys nothing here.

### Option B — Site Config only ✅ RECOMMENDED

Store the rule as a single path in the theme document.

- Directly satisfies "should also be saved in the Site Config".
- **Zero backend work.** No table, no endpoint, no cache invalidation.
- Single source of truth.
- The user page already fetches and caches the theme document during SSR.
- Precedent exists (`theme.noticeModal.enabled`).
- Bonus: the theme doc is hostname-scoped, so per-site rules come free (see Q3).

**Trade-off to accept:** the theme document is fetched during SSR on **every page load for every
visitor**. A few KB of rule text is fine; a long HTML document is not. Mitigate with a length cap in
the editor.

### Where in `SiteConfig` to put it

The interface has 6 groups: `identity`, `theme`, `assets`, `contact`, `integrations`, `seo`
(`useDefaultThemeConfig.ts:957`). A rich-text body fits none of them.

- **Preferred:** new 7th group `content`, with `depositRule: string`. Honest about what it is, and
  leaves room for future CMS-authored copy.
- Alternative: `theme.transactionmodal.depositRuleHtml` — no schema change to the group list, but
  that group is styling tokens; putting prose there is misleading.

Either way it deserves an ADR.

---

## 5. Work items

### monkey-admin (6)

1. `app/theme-schema/site-config.ts` — add `content` group + `ContentConfig` interface, `depositRule: ''`.
2. New `app/composables/useCmsDepositRule.ts` — simpler than `useCmsNotice` (no second storage, no
   API module): `getField` / `setField` / `isFieldDirty` / `saveCategory('depositRule', ['content.depositRule'])`.
3. New `app/pages/(app)/cms/deposit-rule/index.vue` — the notices page minus the enabled switch:
   `LayoutPageHeader`, error `UAlert` + reload, info `UAlert`, loading spinner, `FormRichTextEditor`,
   Save gated on `can.edit()` and `dirty`.
4. `app/config/navigation.ts` — new child `cms-deposit-rule` inserted **immediately after**
   `cms-notices`; icon suggestion `lucide:scroll-text`; `to: '/cms/deposit-rule'`.
5. i18n — `navigation.sg.cmsDepositRule`, `pageMeta.cmsDepositRule`, `cms.depositRule.*`
   (`info`, `content`, `placeholder`, `saved`, `saveFailed`, `loadFailed`) in every admin locale.
6. Test — mirror `test/components/CmsNoticesPage.spec.ts`.

Permissions: reuse `cms:view` / `cms:edit`. Verify the theme PUT route enforces the same.

### monkey-user-t3 (3)

1. `app/composables/useDefaultThemeConfig.ts` — add the **identical** `content` group + default.
   Must match the admin shape exactly, or the merge drops it silently.
2. `app/components/transaction/BankPaymentContent.vue` — render the rule in the account card via
   `renderRichContent`, behind `v-if` so an empty rule renders nothing (no empty box).
3. Docs — KNOWLEDGEBASE (site-config contract + File Reading Map) and a DECISIONS ADR for the new group.

### monkey-admin-api

None, under Option B.

---

## 6. Open questions (blocking)

**Q1 — What does the card actually show?**
The card currently renders the **member's own** bank details. For a deposit you would normally show
the **company's receiving account**. If the real intent is "the deposit account should come from the
CMS instead of the member record", that is **structured fields** (bank name / number / holder), not a
rich-text blob — a materially different design. This changes most of the user-page work.

**Q2 — Replace or append?**
Does the rule replace the card's contents, or sit under the account numbers as instructions?

**Q3 — Scope: per-site or global?**
The theme document is hostname-scoped (per-site rules come free). The Notices table is global
(`scope:'default'`). Which is wanted?

**Q4 — Rich text or plain text?**
Rich text implies sanitization, CSP, and payload size in the SSR site config on every page load.

---

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Schema shapes drift between the two repos → value silently vanishes | Add the field to both typed defaults in the same change; note the coupling in KNOWLEDGEBASE |
| Rich-text payload bloats every SSR response | Length cap in the editor; keep the field a single string |
| Untrusted HTML into the deposit modal | Sanitize at the render boundary using the existing `renderRichContent` / `sanitizeHtml` helpers |
| Theme doc caching (5s server memo, localStorage warm start, anon page cache) delays visible updates | Expected; document the propagation delay for CMS editors |
