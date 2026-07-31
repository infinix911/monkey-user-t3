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
 */

/** Lift shared by both buttons. Kept here so the two call sites can't diverge. */
const AUTH_BUTTON_SHADOW = "0px 5.14286px 5.14286px rgba(0, 0, 0, 0.25)";

/**
 * `background` value for an auth button.
 *
 * A configured value that already names `border-box` owns both layers and is
 * used verbatim — that is the bundled default and the old CMS contract, and
 * appending to it would produce invalid CSS.
 */
function withBorderGradient(fill: string, borderGradient: string): string {
  if (!fill) return fill;
  if (fill.includes("border-box")) return fill;
  return `${fill} padding-box, ${borderGradient} border-box`;
}

export function useAuthButtonStyle() {
  const { authButton } = useSiteConfig().theme;

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
