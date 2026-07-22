function requireAbsoluteUrl(
  variable: "NUXT_API_URL" | "NUXT_WS_API_URL",
  protocols: readonly string[],
): string {
  const value = process.env[variable]?.trim();
  if (!value) {
    throw new Error(`${variable} is not configured`);
  }

  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) {
      throw new Error(`must use ${protocols.join(" or ")}`);
    }
    return value.replace(/\/$/, "");
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(
      `${variable} must be an absolute ${protocols.join(" or ")} URL${detail}`,
    );
  }
}

export function getApiHostUrl(): string {
  return requireAbsoluteUrl("NUXT_API_URL", ["http:", "https:"]);
}

export function getWebsocketHostUrl(): string {
  return requireAbsoluteUrl("NUXT_WS_API_URL", ["ws:", "wss:"]);
}
