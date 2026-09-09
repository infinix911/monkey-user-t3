/**
 * @file app/utils/logger.ts
 * @description Centralised logging that survives the production build.
 *
 * ## Why this exists, and why it is not the admin console's logger
 *
 * The admin app's `logger` suppresses everything when `import.meta.dev` is
 * false. Copying that here would have changed nothing: `nuxt.config.ts` already
 * sets `dropConsole: true`, so the minifier strips every `console.*` call out of
 * the production bundle.
 *
 * The real defect BUG-017 describes is the other side of that coin. Because the
 * calls are stripped, a failure whose *only* handling is `console.error` leaves
 * no trace at all in production — no console noise, but no telemetry either.
 * `@sentry/nuxt` is installed and initialised (`sentry.client.config.ts`) and
 * nothing in application code has ever reported to it.
 *
 * So `logger.error` forwards to Sentry in production and prints in development.
 * `warn` and `log` stay development-only: they are diagnostics, not incidents,
 * and paying Sentry quota for them would drown the signal.
 *
 * ## What this does not do
 *
 * Logging is not user feedback. Several call sites still swallow a failure with
 * nothing on screen; each of those needs a dialog or an inline message of its
 * own. Routing them here makes them *visible to us*, not to the member.
 *
 * @example
 * import { logger } from "~/utils/logger";
 * logger.error("Failed to open game:", err);
 */

const isDev = import.meta.dev;

/**
 * Report an error to Sentry without making the caller wait on the import.
 *
 * `@sentry/nuxt` is loaded lazily so a module that only ever logs on a rare
 * failure path does not pull the SDK into its chunk. A failure to report is
 * swallowed: telemetry must never be the reason a user-facing action breaks.
 *
 * @param args - The original `console.error` arguments.
 */
function reportToSentry(args: unknown[]): void {
  const error = args.find(arg => arg instanceof Error);
  const message = args
    .filter(arg => typeof arg === "string")
    .join(" ")
    .trim();

  void import("@sentry/nuxt")
    .then((Sentry) => {
      if (error instanceof Error) {
        Sentry.captureException(error, message ? { extra: { message } } : undefined);
        return;
      }
      // No Error object in the arguments — a bare string log. Capture it as a
      // message so the failure is still countable, rather than dropping it.
      if (message) Sentry.captureMessage(message, "error");
    })
    .catch(() => {
      // Sentry unavailable (no DSN, blocked, offline). Nothing further to do.
    });
}

/** Centralised logger. `error` reaches production telemetry; the rest do not. */
export const logger = {
  /**
   * Development-only diagnostic (maps to `console.log`).
   *
   * @param args - Values to log.
   */
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },

  /**
   * Development-only warning (maps to `console.warn`).
   *
   * @param args - Values to log.
   */
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
  },

  /**
   * An error. Printed in development, reported to Sentry in production.
   *
   * @param args - Values to log; an `Error` among them is captured as the
   *   exception, and any strings become its message.
   */
  error: (...args: unknown[]): void => {
    if (isDev) {
      console.error(...args);
      return;
    }
    reportToSentry(args);
  },
};
