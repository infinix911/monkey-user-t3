/**
 * Server-only session hydration.
 *
 * In development, calls /auth/v with the visitor's forwarded bn.session cookie
 * so Pinia is populated before SSR render — no anonymous-to-authenticated
 * flash on first paint.
 *
 * In production, this plugin is a no-op. The frontend Worker origin and the
 * backend API origin are different domains, and the bn.session cookie is
 * scoped to the API domain, so the Worker never receives it and cannot
 * forward it to /auth/v. Client-side hydration takes over (see
 * session-verify.client.ts).
 */
import type { VerifyUserResponse } from "@/stores/auth";

export default defineNuxtPlugin(async () => {
  if (process.env.NODE_ENV === "production") return;

  const app = useAuthStore();
  const api = useApi();

  try {
    const result = await api<VerifyUserResponse>("/auth/v");
    if (!result?.id) return;

    app.setUser({
      id: result.id,
      username: result.username,
      level: result.level,
      level_name: result.level_name || "",
      level_exp: result.level_exp || "",
      level_min_exp: result.level_min_exp || "",
      next_level: result.next_level || 0,
      next_level_name: result.next_level_name || "",
      next_level_min_exp: result.next_level_min_exp || "",
      wallet: result.wallet,
      point_wallet: result.point_wallet,
      bank_name: result.bank_name,
      bank_account: result.bank_account,
      bank_account_name: result.bank_account_name,
      phone: result.phone,
      user_type: result.user_type,
      currency: result.currency,
      upper_id: result.upper_id,
    });
  } catch {
    // No valid session — anonymous render
  }
});
