/** Lightweight process health check; intentionally does not call an upstream. */
export default defineEventHandler(() => ({ status: "ok" }));
