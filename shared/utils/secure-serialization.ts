/** Serialize JSON for an inline script without permitting an HTML parser breakout. */
export function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Preserve trusted JavaScript while preventing a literal closing script tag. */
export function escapeInlineScript(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
}
