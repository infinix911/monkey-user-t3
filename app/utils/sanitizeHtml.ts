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

function safeStyle(value: string): string {
  const declarations: string[] = [];
  for (const declaration of value.split(";")) {
    const [rawName, ...rest] = declaration.split(":");
    const name = rawName?.trim().toLowerCase();
    const styleValue = rest.join(":").trim().toLowerCase();
    if (!name || !styleValue) continue;
    if (name === "text-align" && /^(?:left|right|center|justify)$/.test(styleValue))
      declarations.push(`${name}:${styleValue}`);
    if (name === "font-size" && /^\d{1,3}(?:\.\d{1,2})?(?:px|rem|em|%)$/.test(styleValue))
      declarations.push(`${name}:${styleValue}`);
    if (name === "color" && /^(?:#[0-9a-f]{3,8}|[a-z]{1,20})$/.test(styleValue))
      declarations.push(`${name}:${styleValue}`);
    if (name === "font-weight" && /^(?:normal|bold|[1-9]00)$/.test(styleValue))
      declarations.push(`${name}:${styleValue}`);
    if (name === "font-style" && /^(?:normal|italic)$/.test(styleValue))
      declarations.push(`${name}:${styleValue}`);
    if (name === "text-decoration" && /^(?:none|underline|line-through)$/.test(styleValue))
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

/** A deterministic strict allowlist used during both SSR and hydration. */
export function sanitizeHtml(raw: string): string {
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
