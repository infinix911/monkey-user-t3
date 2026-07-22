import { escapeHtml, sanitizeHtml } from "@/utils/sanitizeHtml";

/** A formatting mark applied to a Tiptap text node. */
interface TiptapMark {
  type: string;
  attrs?: {
    href?: string;
    color?: string;
    fontSize?: string;
    [key: string]: unknown;
  };
}

/** A single node in a Tiptap JSON document tree. */
interface TiptapNode {
  type?: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  attrs?: {
    textAlign?: string;
    level?: number;
    src?: string;
    alt?: string;
    [key: string]: unknown;
  };
}

/** Accepted shapes for rich content: a node, a raw string, or null/undefined. */
type TiptapInput = TiptapNode | string | null | undefined;

/**
 * Convert a Tiptap JSON node to an HTML string.
 */
export const tiptapToHtml = (node: TiptapInput): string => {
  if (!node) return "";
  if (typeof node === "string") return node;

  if (node.type === "text") {
    let text = escapeHtml(node.text || "");
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case "bold":
            text = `<strong>${text}</strong>`;
            break;
          case "italic":
            text = `<em>${text}</em>`;
            break;
          case "underline":
            text = `<u>${text}</u>`;
            break;
          case "strike":
            text = `<s>${text}</s>`;
            break;
          case "code":
            text = `<code>${text}</code>`;
            break;
          case "link":
            text = `<a href="${escapeHtml(String(mark.attrs?.href || "#"))}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            break;
          case "textStyle": {
            const styles: string[] = [];
            if (mark.attrs?.color)
              styles.push(`color: ${escapeHtml(String(mark.attrs.color))}`);
            if (mark.attrs?.fontSize)
              styles.push(`font-size: ${escapeHtml(String(mark.attrs.fontSize))}`);
            if (styles.length)
              text = `<span style="${styles.join("; ")}">${text}</span>`;
            break;
          }
        }
      }
    }
    return text;
  }

  const children = node.content
    ? node.content.map((child) => tiptapToHtml(child)).join("")
    : "";
  const textAlign = String(node.attrs?.textAlign ?? "").toLowerCase();
  const align =
    /^(?:right|center|justify)$/.test(textAlign)
      ? ` style="text-align: ${textAlign}"`
      : "";

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p${align}>${children || "<br>"}</p>`;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2));
      return `<h${level}${align}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${children}</code></pre>`;
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "image":
      return `<img src="${escapeHtml(String(node.attrs?.src || ""))}" alt="${escapeHtml(String(node.attrs?.alt || ""))}" />`;
    default:
      return children;
  }
};

/**
 * Render tiptap JSON (or string) to sanitized HTML.
 */
export const renderTiptap = (data: TiptapInput): string => {
  if (!data) return "";
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return sanitizeHtml(tiptapToHtml(parsed));
    } catch {
      return sanitizeHtml(data);
    }
  }
  if (typeof data === "object") {
    return sanitizeHtml(tiptapToHtml(data));
  }
  return "";
};

/**
 * Render admin-managed rich content to sanitized HTML.
 *
 * Accepts any of:
 *   - raw HTML string
 *   - JSON-string of a Tiptap document
 *   - Tiptap JSON document (`{ type, content }`)
 *   - map of values (e.g. locale-keyed) whose entries are any of the above
 *
 * The deterministic sanitizer has no DOM dependency, so SSR and hydration
 * produce the same safe markup.
 *
 * Shared by `NoticeSection.vue` and the homepage SEO intro in `default.vue`.
 */
export const renderRichContent = (
  data: TiptapInput | Record<string, unknown>,
): string => {
  if (!data) return "";

  let html = "";

  if (typeof data === "string") {
    try {
      html = tiptapToHtml(JSON.parse(data));
    } catch {
      html = data;
    }
  } else if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    // Tiptap JSON document
    if (record.type || Array.isArray(record.content)) {
      html = tiptapToHtml(data as TiptapNode);
    } else {
      // Map of values — render every non-empty entry
      const parts: string[] = [];
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (typeof val === "string" && val.trim()) {
          try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === "object") {
              parts.push(tiptapToHtml(parsed as TiptapNode));
              continue;
            }
          } catch {
            /* not JSON — treat as raw HTML */
          }
          parts.push(val);
        } else if (
          typeof val === "object" &&
          val !== null &&
          ((val as Record<string, unknown>).type ||
            (val as Record<string, unknown>).content)
        ) {
          parts.push(tiptapToHtml(val as TiptapNode));
        }
      }
      html = parts.join("");
    }
  }

  return sanitizeHtml(html);
};
