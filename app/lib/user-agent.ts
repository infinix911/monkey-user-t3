/**
 * User agent parsing utilities
 */
export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
}

export function parseUserAgent(userAgentString: string): ParsedUserAgent {
  const ua = userAgentString.toLowerCase();

  // Parse Browser
  let browser = "Unknown";
  if (ua.indexOf("chrome") > -1 && ua.indexOf("edg") === -1) {
    const match = ua.match(/chrome\/(\d+)/);
    browser = match ? `Chrome ${match[1]}` : "Chrome";
  } else if (ua.indexOf("safari") > -1 && ua.indexOf("chrome") === -1) {
    browser = "Safari";
  } else if (ua.indexOf("firefox") > -1) {
    const match = ua.match(/firefox\/(\d+)/);
    browser = match ? `Firefox ${match[1]}` : "Firefox";
  } else if (ua.indexOf("edg") > -1) {
    const match = ua.match(/edg\/(\d+)/);
    browser = match ? `Edge ${match[1]}` : "Edge";
  } else if (ua.indexOf("opr/") > -1 || ua.indexOf("opera") > -1) {
    const match = ua.match(/opr\/(\d+)|opera\/(\d+)/);
    browser = match ? `Opera ${match[1] ?? match[2]}` : "Opera";
  } else if (ua.indexOf("trident") > -1) {
    browser = "IE";
  }

  // Parse OS
  let os = "Unknown";
  if (ua.indexOf("windows") > -1) {
    if (ua.indexOf("windows nt 10.0") > -1) {
      os = "Windows 10";
    } else if (ua.indexOf("windows nt 6.3") > -1) {
      os = "Windows 8.1";
    } else if (ua.indexOf("windows nt 6.2") > -1) {
      os = "Windows 8";
    } else if (ua.indexOf("windows nt 6.1") > -1) {
      os = "Windows 7";
    } else {
      os = "Windows";
    }
  } else if (ua.indexOf("mac os x") > -1) {
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    os = match ? `macOS ${match[1]!.replace(/_/g, ".")}` : "macOS";
  } else if (ua.indexOf("linux") > -1) {
    if (ua.indexOf("android") > -1) {
      const match = ua.match(/android (\d+)/);
      os = match ? `Android ${match[1]}` : "Android";
    } else {
      os = "Linux";
    }
  } else if (ua.indexOf("iphone") > -1 || ua.indexOf("ipad") > -1) {
    const match = ua.match(/os (\d+[._]\d+)/);
    if (ua.indexOf("ipad") > -1) {
      os = match ? `iPadOS ${match[1]!.replace(/_/g, ".")}` : "iPadOS";
    } else {
      os = match ? `iOS ${match[1]!.replace(/_/g, ".")}` : "iOS";
    }
  }

  // Parse Device
  let device = "Unknown";
  if (ua.indexOf("mobile") > -1 || ua.indexOf("android") > -1) {
    device = "Mobile";
  } else if (ua.indexOf("tablet") > -1 || ua.indexOf("ipad") > -1) {
    device = "Tablet";
  } else if (
    ua.indexOf("windows") > -1 ||
    ua.indexOf("mac") > -1 ||
    ua.indexOf("linux") > -1
  ) {
    device = "Desktop";
  }

  return { browser, os, device };
}

export function formatDeviceInfo(userAgentString: string): string {
  const { browser, os, device } = parseUserAgent(userAgentString);
  return `${device} - ${os} - ${browser}`;
}
