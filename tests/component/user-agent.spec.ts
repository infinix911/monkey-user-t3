/**
 * Login History device labels (lib/user-agent.ts) and the shared pager window
 * (utils/pageWindow.ts).
 *
 * The user agents are the ones the Login History modal showed wrongly: iPhone
 * and iPad read as "macOS - Safari", Samsung Internet and Opera as Chrome, and
 * everything was English under Korean.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatDeviceInfo, parseUserAgent } from "~/lib/user-agent";
import { pageWindow } from "~/utils/pageWindow";

const load = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(__dirname, `../../i18n/locales/${name}.json`), "utf8")) as Record<string, unknown>;

function i18n(messages: Record<string, unknown>) {
  const get = (key: string): unknown =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
  return { t: (key: string) => String(get(key)), te: (key: string) => typeof get(key) === "string" };
}

const ko = i18n(load("ko"));
const en = i18n(load("en"));
const label = (ua: string) => formatDeviceInfo(ua, ko.t, ko.te);

describe("formatDeviceInfo", () => {
  it("labels every common browser / OS in Korean", () => {
    expect(label("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"))
      .toBe("데스크톱 - 윈도우 10 - 크롬 129");
    expect(label("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0"))
      .toBe("데스크톱 - 윈도우 10 - 엣지 129");
    expect(label("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15"))
      .toBe("데스크톱 - 맥OS 14.6 - 사파리");
    expect(label("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"))
      .toBe("데스크톱 - 윈도우 10 - 파이어폭스 131");
    expect(label("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"))
      .toBe("데스크톱 - 리눅스 - 크롬 129");
  });

  it("does not mistake an iPhone or iPad for macOS", () => {
    expect(label("Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1"))
      .toBe("모바일 - iOS 17.6 - 사파리");
    expect(label("Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1"))
      .toBe("태블릿 - iPadOS 17.6 - 크롬 129");
  });

  it("tells Samsung Internet and Opera apart from Chrome", () => {
    expect(label("Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36"))
      .toBe("모바일 - 안드로이드 14 - 삼성 인터넷 25");
    expect(label("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 OPR/84.0"))
      .toBe("모바일 - 안드로이드 14 - 오페라 84");
  });

  it("shows a single unknown for an unrecognisable agent", () => {
    expect(label("curl/8.4.0")).toBe("알 수 없음");
    expect(label("")).toBe("알 수 없음");
  });

  it("uses English labels under en", () => {
    expect(formatDeviceInfo("Mozilla/5.0 (Windows NT 10.0) Chrome/129.0", en.t, en.te)).toBe("Desktop - Windows 10 - Chrome 129");
  });

  it("returns stable keys from parseUserAgent", () => {
    expect(parseUserAgent("Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Chrome/129.0 Safari/537.36"))
      .toEqual({ browser: "chrome", browserVersion: "129", os: "android", osVersion: "14", device: "tablet" });
  });
});

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
  });

  it("keeps a long range to a handful of buttons", () => {
    expect(pageWindow(1, 303)).toEqual([1, 2, 3, 4, 5, 6, "...", 303]);
    expect(pageWindow(150, 303)).toEqual([1, "...", 147, 148, 149, 150, 151, 152, 153, "...", 303]);
    expect(pageWindow(303, 303)).toEqual([1, "...", 298, 299, 300, 301, 302, 303]);
  });
});
