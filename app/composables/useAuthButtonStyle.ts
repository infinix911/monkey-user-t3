/**
 * Style objects for the guest LOGIN / SIGN UP buttons, shared by the desktop
 * header (`AppHeader.vue`) and the mobile auth strip (`layouts/default.vue`) so
 * the two cannot drift.
 *
 * ## Why the background is composed rather than passed through
 *
 * A gradient border is not expressible via `border-color`, so these buttons use
 * the two-layer trick: the fill clipped to `padding-box`, the border gradient
 * clipped to `border-box`, and a **transparent** border for the latter to show
 * through. The bundled theme ships `loginBg`/`signupBg` as a single value
 * carrying both layers.
 *
 * A CMS that overrides those fields with a plain `linear-gradient(...)` supplies
 * only the fill. The transparent border then has nothing behind it and the
 * button renders borderless — the failure is silent, because both halves are
 * individually valid CSS. So when the configured background carries no
 * `border-box` layer, compose one from the dedicated border-gradient token
 * instead of trusting the fill to contain it.
 *
 * ## Why this returns a computed
 *
 * `useSiteConfig()` hands back ONE stable reactive object that `syncSiteConfig`
 * mutates in place when the CMS payload lands — deliberately, so components
 * that mounted against the bundled fallback pick the real values up. That only
 * works for reads Vue can track, i.e. reads that happen during render.
 *
 * Resolving the tokens to plain strings in setup breaks that: the CMS payload
 * arrives from a `watch` in `app.vue` AFTER the header has mounted, and a
 * snapshot taken in setup keeps the fallback colours for the life of the page.
 * Wrapping the lookup in `computed` keeps the reads inside a tracked effect, so
 * a late CMS payload repaints the buttons.
 */
import type { ThemeAuthButtonConfig } from "@/composables/useDefaultThemeConfig";

/** Lift shared by both buttons. Kept here so the two call sites can't diverge. */
const AUTH_BUTTON_SHADOW = "0px 5.14286px 5.14286px rgba(0, 0, 0, 0.25)";

/**
 * `background` value for an auth button.
 *
 * A configured value that already names `border-box` owns both layers and is
 * used verbatim — that is the bundled default and the old CMS contract, and
 * appending to it would produce invalid CSS.
 *
 * An empty border gradient is also returned verbatim: appending
 * `, undefined border-box` would make the whole declaration invalid, and the
 * browser drops an invalid `background` outright — leaving a button with no
 * fill at all, which is worse than one with no border.
 */
function withBorderGradient(fill: string, borderGradient: string): string {
  if (!fill) return fill;
  if (fill.includes("border-box")) return fill;
  if (!borderGradient) return fill;
  return `${fill} padding-box, ${borderGradient} border-box`;
}

/**
 * One button's inline-style object.
 *
 * A `type` alias, not an `interface`: Vue types `style` as a value with an
 * index signature, and TypeScript gives implicit index signatures to type
 * aliases but not to interfaces — so declaring this as an interface makes it
 * unassignable to `:style` at every call site.
 */
type AuthButtonStyle = {
  background: string;
  border: string;
  boxShadow: string;
};

/**
 * Build both buttons' styles from the live theme.
 *
 * @param authButton - The resolved `theme.authButton` group.
 * @returns The login and signup style objects.
 */
function buildStyles(authButton: ThemeAuthButtonConfig): {
  login: AuthButtonStyle;
  signup: AuthButtonStyle;
} {
  return {
    login: {
      background: withBorderGradient(authButton.loginBg, authButton.loginBorderGradient),
      border: authButton.loginBorder,
      boxShadow: AUTH_BUTTON_SHADOW,
    },
    signup: {
      background: withBorderGradient(authButton.signupBg, authButton.signupBorderGradient),
      border: authButton.signupBorder,
      boxShadow: AUTH_BUTTON_SHADOW,
    },
  };
}

/**
 * Reactive auth-button styles.
 *
 * Returned as a single computed rather than an object of computeds: a ref
 * returned straight from `setup` is unwrapped in the template, so call sites
 * keep reading `authButtonStyle.login` unchanged. Refs nested inside a plain
 * object would NOT be unwrapped and would break those bindings.
 *
 * @returns A computed holding the `login` and `signup` style objects.
 */
export function useAuthButtonStyle() {
  const siteConfig = useSiteConfig();
  return computed(() => buildStyles(siteConfig.theme.authButton));
}
