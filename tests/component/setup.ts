/**
 * Component-test environment setup.
 *
 * Nuxt auto-runs client plugins inside `mountSuspended`. One of them
 * (`app/plugins/pwa-manifest.client.ts`) calls `URL.createObjectURL(blob)`
 * from an `onNuxtReady` idle callback. happy-dom's `createObjectURL` throws
 * `ERR_INVALID_ARG_TYPE` on its own Blob instances, and because the callback
 * fires after the test body resolves it surfaces as an unhandled rejection
 * that fails the run (non-zero exit) even though every assertion passes.
 *
 * This is purely an environment quirk, unrelated to bet-submission behavior,
 * so we stub `createObjectURL`/`revokeObjectURL` to inert no-ops. No app code
 * is modified.
 */
if (typeof URL !== "undefined") {
  URL.createObjectURL = () => "blob:mock";
  URL.revokeObjectURL = () => {};
}
