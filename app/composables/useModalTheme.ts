/**
 * useModalTheme — the deposit/withdraw palette as CSS variables.
 *
 * `theme.transactionmodal` is the brand's modal palette: the CMS themes the
 * deposit and withdrawal modals with it, and every other themed surface is
 * expected to match them. Rather than each surface reaching into the config and
 * picking its own colours (which is how the account panels drifted into
 * hardcoded `#505050` greys), they spread this one bundle on a host element and
 * consume it through the `.tm-*` classes in `main.css`.
 *
 * Set it once per host that wraps themed surfaces — the desktop rail panel, the
 * profile modal, each standalone modal — and every descendant inherits it.
 *
 * @returns {ComputedRef<Record<string, string>>} Style object of CSS variables.
 */
export function useModalTheme() {
  const siteConfig = useSiteConfig();

  return computed<Record<string, string>>(() => {
    const tm = siteConfig.theme.transactionmodal;
    // A CMS override can blank the button gradient. An empty custom property is
    // still "set", so `var(--tm-btn-grad, var(--tm-btn-bg))` would resolve to
    // nothing rather than to the solid colour — omit the key instead so the
    // fallback in `.tm-btn` actually fires.
    const gradients: Record<string, string> = {};
    if (tm.buttonGradientColor) {
      gradients["--tm-btn-grad"] = tm.buttonGradientColor;
    }
    if (tm.buttonGradientHoverColor) {
      gradients["--tm-btn-grad-hover"] = tm.buttonGradientHoverColor;
    }

    return {
      // Panel fill + gradient border ring (`.modal-body-fill` /
      // `.modal-gradient-border`), named as those classes expect.
      "--body-bg": tm.modalBgColor,
      "--b-mid": tm.borderColor,
      "--b-accent": tm.accentColor,
      // Accent: focus rings, active states, section labels, table headers.
      "--tm-accent": tm.accentColor,
      // Raised surfaces. The quick-amount chip is the palette's "one step
      // lighter than the panel" colour, which is exactly what cards, table
      // rows and list items need.
      "--tm-chip": tm.quickAmountBgColor,
      "--tm-chip-hover": tm.quickAmountBgHoverColor,
      // Form controls.
      "--tm-input-bg": tm.inputBgColor,
      "--tm-input-border": tm.inputBorderColor,
      "--tm-input-text": tm.inputTextColor,
      "--tm-input-ph": tm.inputPlaceholderColor,
      // Primary action buttons.
      "--tm-btn-bg": tm.buttonBgColor,
      "--tm-btn-text": tm.buttonTextColor,
      ...gradients,
    };
  });
}
