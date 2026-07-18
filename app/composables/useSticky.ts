import { ref, computed } from "vue";

/**
 * Sticky Header/Navbar Composable
 *
 * Manages sticky positioning state for header and navbar.
 * Used in layout components to control sticky behavior based on route.
 *
 * Game pages (iframe routes) don't have sticky header/navbar.
 * All other pages use sticky positioning.
 *
 * TODO: In Phase 3, add scroll detection logic from Next.js MainLayoutWrapper
 * to handle dynamic sticky behavior based on scroll position.
 */

export const useSticky = () => {
  const route = useRoute();

  /**
   * Determine if header should be sticky based on current route
   * Game routes (/:game_type/:game_id) don't use sticky header
   */
  const isHeaderSticky = computed(() => {
    // Game pages don't have sticky header
    // Pattern: /slot/GAME_xyz, /casino/GAME_xyz, etc.
    return !route.path.match(/^\/[^/]+\/GAME_/);
  });

  /**
   * Header height in pixels
   * TODO: Set dynamically based on actual header element height
   */
  const headerHeight = ref(0);

  /**
   * Navbar height in pixels
   * TODO: Set dynamically based on actual navbar element height
   */
  const navbarHeight = ref(0);

  /**
   * Set header height (call from layout after measuring DOM element)
   */
  const setHeaderHeight = (height: number) => {
    headerHeight.value = height;
  };

  /**
   * Set navbar height (call from layout after measuring DOM element)
   */
  const setNavbarHeight = (height: number) => {
    navbarHeight.value = height;
  };

  return {
    isHeaderSticky,
    headerHeight: readonly(headerHeight),
    navbarHeight: readonly(navbarHeight),
    setHeaderHeight,
    setNavbarHeight,
  };
};
