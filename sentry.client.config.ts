/**
 * Sentry — Browser (client) initialization
 *
 * Loaded by the @sentry/nuxt module on the client. Captures unhandled errors,
 * performance traces, and Session Replay. Stays inert when the public DSN is
 * empty, so dev/preview without a DSN behave identically.
 *
 * The DSN is read from public runtime config (NUXT_PUBLIC_SENTRY_DSN). Note the
 * Session Replay worker is spawned from a blob URL — the nuxt-security CSP
 * allows this via `worker-src 'self' blob:` (see nuxt.config.ts).
 */

import * as Sentry from "@sentry/nuxt";

const config = useRuntimeConfig();
const dsn = config.public.sentry?.dsn as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Performance tracing.
    tracesSampleRate: 0.1,
    // Session Replay: record 10% of all sessions, and 100% of sessions where
    // an error occurs.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
}
