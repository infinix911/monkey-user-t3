const ALLOWED_TAGS = new Set([
  "a", "address", "article", "b", "blockquote", "br", "code", "dd", "div",
  "dl", "dt", "em", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
  "i", "img", "li", "mark", "ol", "p", "pre", "s", "section", "small",
  "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead",
  "tr", "u", "ul",
]);
const VOID_TAGS = new Set(["br", "hr", "img"]);
const GLOBAL_ATTRIBUTES = new Set(["class", "style", "title", "aria-label"]);
const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
};

export const escapeHtml = (value: string): string =>
  value
    .replace(
      /&(?!(?:amp|lt|gt|quot|#39|nbsp|hellip|mdash|ndash|copy|reg|#\d{1,7}|#x[0-9a-f]{1,6});)/gi,
      "&amp;",
    )
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function safeUrl(value: string, image: boolean): string | null {
  const decoded = value.replace(/&(?:#x0*([0-9a-f]+)|#0*([0-9]+)|colon);?/gi, (_m, hex, dec) =>
    String.fromCharCode(hex ? Number.parseInt(hex, 16) : dec ? Number(dec) : 58),
  );
  const compact = Array.from(decoded)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 32 && code !== 127;
    })
    .join("");
  if (/^(?:https?:|\/|#)/i.test(compact)) return value;
  if (!image && /^(?:mailto:|tel:)/i.test(compact)) return value;
  if (image && /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(compact))
    return value;
  return null;
}

/**
 * CSS properties an admin may use to lay out and style rich content — the
 * custom-SEO footer, notices and dialog copy are authored as HTML in the CMS and
 * routinely carry a grid/flex layout with their own spacing, borders and
 * backgrounds. Every property here is inert on its own (it can only paint or
 * position within the element's own box); the value guard below strips the parts
 * of CSS that can load or run anything. Note `position`, `transform`, `z-index`,
 * `content` and `cursor` are deliberately excluded so admin markup can never lay
 * an invisible overlay over the real UI (clickjacking).
 */
const ALLOWED_STYLE_PROPS = new Set([
  // typography
  "color", "font", "font-family", "font-size", "font-weight", "font-style",
  "line-height", "letter-spacing", "word-spacing", "text-align",
  "text-decoration", "text-transform", "text-shadow", "text-indent",
  "white-space", "word-break", "overflow-wrap", "word-wrap", "vertical-align",
  "list-style", "list-style-type", "list-style-position",
  // box model
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "box-sizing", "overflow", "overflow-x", "overflow-y",
  // border / background / effects
  "background", "background-color", "background-position", "background-size",
  "background-repeat", "background-clip",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-color", "border-style", "border-width", "border-radius",
  "box-shadow", "opacity", "outline", "aspect-ratio",
  // layout
  "display", "flex", "flex-direction", "flex-wrap", "flex-flow", "flex-grow",
  "flex-shrink", "flex-basis", "justify-content", "justify-items",
  "justify-self", "align-items", "align-content", "align-self", "gap",
  "row-gap", "column-gap", "order",
  "grid", "grid-template", "grid-template-columns", "grid-template-rows",
  "grid-template-areas", "grid-auto-flow", "grid-auto-columns",
  "grid-auto-rows", "grid-column", "grid-row", "grid-area", "grid-gap",
  "place-items", "place-content", "place-self",
]);

/**
 * Value fragments that can pull in an external resource, execute, or escape the
 * CSS context. Any declaration whose value matches is dropped whole. `url()` is
 * intentionally banned outright (so `background-image` cannot fetch/track);
 * layout functions like `repeat()`, `minmax()`, `calc()` remain allowed.
 */
const UNSAFE_STYLE_VALUE =
  /url\(|image-set\(|-webkit-image-set\(|expression\(|javascript:|vbscript:|data:|@import|behavior|-moz-binding|[<>\\]/i;

function safeStyle(value: string): string {
  const declarations: string[] = [];
  for (const declaration of value.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    const name = declaration.slice(0, colon).trim().toLowerCase();
    const styleValue = declaration.slice(colon + 1).trim();
    if (!name || !styleValue) continue;
    if (!ALLOWED_STYLE_PROPS.has(name)) continue;
    // Length cap + token/comment guard: keep any one declaration from smuggling
    // an oversized or obfuscated (comment-split) payload past the checks above.
    if (styleValue.length > 300) continue;
    if (styleValue.includes("/*") || styleValue.includes("*/")) continue;
    if (UNSAFE_STYLE_VALUE.test(styleValue)) continue;
    declarations.push(`${name}:${styleValue}`);
  }
  return declarations.join(";");
}

function sanitizeAttributes(tag: string, raw: string): string {
  const attributes: string[] = [];
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const name = (match[1] ?? "").toLowerCase();
    if (!GLOBAL_ATTRIBUTES.has(name) && !TAG_ATTRIBUTES[tag]?.has(name)) continue;
    let value = match[2] ?? match[3] ?? match[4] ?? "";
    if (name === "href" || name === "src") {
      const url = safeUrl(value, name === "src");
      if (!url) continue;
      value = url;
    } else if (name === "style") {
      value = safeStyle(value);
      if (!value) continue;
    } else if (name === "class") {
      value = value.split(/\s+/).filter((token) => /^[a-z0-9_-]{1,64}$/i.test(token)).slice(0, 24).join(" ");
      if (!value) continue;
    } else if ((name === "width" || name === "height" || name === "colspan" || name === "rowspan") && !/^\d{1,4}$/.test(value)) {
      continue;
    } else if (name === "target" && value !== "_blank" && value !== "_self") {
      continue;
    } else if (name === "loading" && value !== "lazy" && value !== "eager") {
      continue;
    } else if (name === "scope" && !/^(?:row|col)$/.test(value)) {
      continue;
    }
    attributes.push(`${name}="${escapeHtml(value)}"`);
  }
  if (tag === "a" && attributes.some((attribute) => attribute === 'target="_blank"')) {
    const relIndex = attributes.findIndex((attribute) => attribute.startsWith("rel="));
    if (relIndex >= 0) attributes.splice(relIndex, 1);
    attributes.push('rel="noopener noreferrer"');
  }
  return attributes.length ? ` ${attributes.join(" ")}` : "";
}

/**
 * Markup that carries no rendered content: comments (including the unclosed
 * `<!-- …` tail some CMS editors save), doctypes, CDATA and XML processing
 * instructions. These are dropped outright — escaping them instead would
 * print the literal `<!-- Header -->` text into the page.
 */
const DROPPED_MARKUP = /<!--[\s\S]*?(?:-->|$)|<![\s\S]*?>|<\?[\s\S]*?(?:\?>|>)/g;

/** A deterministic strict allowlist used during both SSR and hydration. */
export function sanitizeHtml(raw: string): string {
  raw = raw.replace(DROPPED_MARKUP, "");
  let result = "";
  let offset = 0;
  const tagPattern = /<[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(raw)) !== null) {
    result += escapeHtml(raw.slice(offset, match.index));
    const token = match[0];
    const parsed = token.match(/^<\s*(\/?)\s*([a-z][a-z0-9-]*)\b([^>]*)>$/i);
    if (parsed) {
      const closing = parsed[1] === "/";
      const tag = (parsed[2] ?? "").toLowerCase();
      if (ALLOWED_TAGS.has(tag)) {
        if (closing) {
          if (!VOID_TAGS.has(tag)) result += `</${tag}>`;
        } else {
          result += `<${tag}${sanitizeAttributes(tag, parsed[3] ?? "")}>`;
        }
      }
    } else {
      result += escapeHtml(token);
    }
    offset = match.index + token.length;
  }
  return result + escapeHtml(raw.slice(offset));
}
