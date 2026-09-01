/**
 * Session-bound caches are deliberately memory-only.  Clear every member
 * resource at the single auth boundary so a logout, expiry, or 401 recovery
 * can never leave one member's data visible to the next session in this tab.
 */
import { useAuthStore } from "@/stores/auth";
import { useGameCatalogStore } from "@/stores/game-catalog";
import { useMemberInboxStore } from "@/stores/member-inbox";
import { useMemberRecordsStore } from "@/stores/member-records";

export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  const gameCatalog = useGameCatalogStore();
  const inbox = useMemberInboxStore();
  const records = useMemberRecordsStore();

  watch(
    () => auth.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      if (isAuthenticated || !wasAuthenticated) return;
      gameCatalog.clear();
      inbox.clear();
      records.clear();
    },
    { flush: "sync" },
  );
});
