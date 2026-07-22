/** Create one opaque key for a single money-action submission. */
export function idempotencyHeaders(): Record<string, string> {
  return { "Idempotency-Key": crypto.randomUUID() };
}
