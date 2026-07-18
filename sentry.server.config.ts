/**
 * Sentry — Nitro server (SSR) initialization
 *
 * Loaded by the @sentry/nuxt module on the node-server runtime. Captures
 * server-side / SSR errors and performance traces. No Session Replay on the
 * server. Stays inert when the DSN is empty.
 *
 * The server reads the DSN from the env directly (runtime config is not yet
 * available at the point this top-level instrumentation runs).
 */

import * as Sentry from "@sentry/nuxt";

const dsn = process.env.NUXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
