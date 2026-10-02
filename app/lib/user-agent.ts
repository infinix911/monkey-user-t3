/**
 * User agent parsing utilities for the Login History modal.
 *
 * `parseUserAgent` returns stable keys (`chrome`, `windows`, `mobile`) plus
 * versions; `formatDeviceInfo` turns them into a localized label through
 * `userAgent.*` (ko `모바일 - iOS 17.6 - 사파리`).
 *
 * Detection order matters: iPhone/iPad user agents also contain "like Mac OS X",
 * and Edge / Opera / Samsung Internet / Chrome-on-iOS all contain "Chrome" or
 * "Safari", so the more specific signatures are checked first.
 */

export type DeviceKind = "desktop" | "mobile" | "tablet" | "unknown";

export interface ParsedUserAgent {
  /** Browser key under `userAgent.browsers` (`chrome`, `edge`, …, `unknown`). */
  browser: string;
  /** Major browser version, or `""`. */
  browserVersion: string;
  /** OS key under `userAgent.os` (`windows`, `macos`, `ios`, …, `unknown`). */
  os: string;
  /** OS version (`10`, `14.6`, `17.6`), or `""`. */
  osVersion: string;
  device: DeviceKind;
}

/** First capture group of `re` in `ua`, with `_` turned into `.`, or `""`. */
function version(ua: string, re: RegExp): string {
  return ua.match(re)?.[1]?.replace(/_/g, ".") ?? "";
}

export function parseUserAgent(userAgentString: string): ParsedUserAgent {
  const ua = (userAgentString ?? "").toLowerCase();

  // Browser: most specific first.
  let browser = "unknown";
  let browserVersion = "";
  if (/edg(e|a|ios)?\//.test(ua)) {
    browser = "edge";
    browserVersion = version(ua, /edg(?:e|a|ios)?\/(\d+)/);
  } else if (/opr\/|opera/.test(ua)) {
    browser = "opera";
    browserVersion = version(ua, /(?:opr|opera)\/(\d+)/);
  } else if (ua.includes("samsungbrowser/")) {
    browser = "samsunginternet";
    browserVersion = version(ua, /samsungbrowser\/(\d+)/);
  } else if (/firefox\/|fxios\//.test(ua)) {
    browser = "firefox";
    browserVersion = version(ua, /(?:firefox|fxios)\/(\d+)/);
  } else if (/chrome\/|crios\//.test(ua)) {
    browser = "chrome";
    browserVersion = version(ua, /(?:chrome|crios)\/(\d+)/);
  } else if (ua.includes("safari/")) {
    browser = "safari";
  } else if (/trident|msie/.test(ua)) {
    browser = "ie";
  }

  // OS: iPad/iPhone before macOS, Android before Linux.
  let os = "unknown";
  let osVersion = "";
  if (ua.includes("ipad")) {
    os = "ipados";
    osVersion = version(ua, /os (\d+[._]\d+)/);
  } else if (/iphone|ipod/.test(ua)) {
    os = "ios";
    osVersion = version(ua, /os (\d+[._]\d+)/);
  } else if (ua.includes("android")) {
    os = "android";
    osVersion = version(ua, /android (\d+(?:\.\d+)?)/);
  } else if (ua.includes("windows")) {
    os = "windows";
    osVersion = ua.includes("windows nt 10.0") ? "10"
      : ua.includes("windows nt 6.3") ? "8.1"
        : ua.includes("windows nt 6.2") ? "8"
          : ua.includes("windows nt 6.1") ? "7"
            : "";
  } else if (/mac os x|macintosh/.test(ua)) {
    os = "macos";
    osVersion = version(ua, /mac os x (\d+[._]\d+)/);
  } else if (ua.includes("linux")) {
    os = "linux";
  }

  // Device.
  let device: DeviceKind = "unknown";
  if (ua.includes("ipad") || ua.includes("tablet") || (os === "android" && !ua.includes("mobile"))) {
    device = "tablet";
  } else if (ua.includes("mobile") || os === "ios" || os === "android") {
    device = "mobile";
  } else if (os === "windows" || os === "macos" || os === "linux") {
    device = "desktop";
  }

  return { browser, browserVersion, os, osVersion, device };
}

type Translate = (key: string) => string;
type Exists = (key: string) => boolean;

/** Localized label for a `userAgent.<group>.<key>` entry, falling back to the key. */
function label(t: Translate, te: Exists, group: string, key: string): string {
  const path = `userAgent.${group}.${key}`;
  return te(path) ? t(path) : key;
}

/**
 * Localized "Device - OS - Browser" label, e.g. ko `데스크톱 - 윈도우 10 - 크롬 129`.
 * A user agent with no recognisable OS or browser shows a single "unknown".
 *
 * @param userAgentString - Raw user agent.
 * @param t - vue-i18n `t`.
 * @param te - vue-i18n `te`.
 * @returns {string} The label.
 */
export function formatDeviceInfo(userAgentString: string, t: Translate, te: Exists): string {
  const { browser, browserVersion, os, osVersion, device } = parseUserAgent(userAgentString);
  if (os === "unknown" && browser === "unknown") return label(t, te, "devices", "unknown");
  const withVersion = (name: string, v: string) => (v ? `${name} ${v}` : name);
  return [
    label(t, te, "devices", device),
    withVersion(label(t, te, "os", os), osVersion),
    withVersion(label(t, te, "browsers", browser), browserVersion),
  ].join(" - ");
}
