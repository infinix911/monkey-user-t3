/**
 * Hydrate app store state from sessionStorage on client mount.
 * Runs once after hydration so SSR markup and initial CSR markup match.
 */
export default defineNuxtPlugin(() => {
  const app = useAuthStore();
  try {
    const saved = sessionStorage.getItem("currentGame");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) app.setCurrentGame(parsed);
    }
  } catch {
    // sessionStorage unavailable or malformed payload — ignore
  }
});
