import type { H3Event } from "h3";
import { getHeader } from "h3";
import {
  normalizeIpAddress,
  resolveCanonicalAuthority,
} from "../../shared/utils/request-security";

interface SecurityContext {
  canonicalAuthority?: string;
  canonicalClientIp?: string;
}

function configuredHosts(): string[] {
  const config = useRuntimeConfig();
  return [
    String(config.allowedHosts ?? ""),
    String(config.public.siteUrl ?? ""),
  ].filter(Boolean);
}

export function getCanonicalAuthority(event: H3Event): string | null {
  const context = event.context as SecurityContext;
  if (context.canonicalAuthority) return context.canonicalAuthority;

  const resolved = resolveCanonicalAuthority(
    getHeader(event, "host"),
    configuredHosts(),
    process.env.NODE_ENV === "production",
  );
  if (!resolved) return null;
  context.canonicalAuthority = resolved.authority;
  return resolved.authority;
}

export function getCanonicalClientIp(event: H3Event): string | null {
  const context = event.context as SecurityContext;
  if (context.canonicalClientIp) return context.canonicalClientIp;

  const cloudflareIp = normalizeIpAddress(getHeader(event, "cf-connecting-ip"));
  const peerIp = normalizeIpAddress(event.node.req.socket.remoteAddress);
  const address = cloudflareIp ?? peerIp;
  if (address) context.canonicalClientIp = address;
  return address;
}
