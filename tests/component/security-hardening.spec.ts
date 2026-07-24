import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { renderRichContent, renderTiptap } from "@/composables/useTiptap";
import { idempotencyHeaders } from "@/lib/idempotency";
import {
  isTrustedInternalI18nRequest,
  normalizeIpAddress,
  resolveCanonicalAuthority,
} from "../../shared/utils/request-security";
import {
  escapeInlineScript,
  serializeJsonForHtml,
} from "../../shared/utils/secure-serialization";
import { normalizeFaqSchemaItems } from "@/composables/useStructuredData";

describe("security boundaries", () => {
  it("issues a fresh UUID idempotency key for each financial submission", () => {
    const first = idempotencyHeaders();
    const second = idempotencyHeaders();

    expect(Object.keys(first)).toEqual(["Idempotency-Key"]);
    expect(first["Idempotency-Key"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(second["Idempotency-Key"]).not.toBe(first["Idempotency-Key"]);
  });

  it("allows only configured Host authorities and ignores forwarded-style lists", () => {
    expect(
      resolveCanonicalAuthority("PLAY.EXAMPLE.COM", ["play.example.com"], true),
    ).toMatchObject({ authority: "play.example.com", hostname: "play.example.com" });
    expect(
      resolveCanonicalAuthority("evil.example, play.example.com", ["play.example.com"], true),
    ).toBeNull();
    expect(
      resolveCanonicalAuthority("play.example.com:444", ["play.example.com"], true),
    ).toBeNull();
  });

  it("allows only Nitro's peerless internal i18n message request", () => {
    const messagesPath = "/_i18n/8e737cb1/ko/messages.json";

    expect(
      isTrustedInternalI18nRequest("localhost", "", messagesPath),
    ).toBe(true);
    expect(
      isTrustedInternalI18nRequest(
        "localhost",
        "127.0.0.1",
        messagesPath,
      ),
    ).toBe(false);
    expect(
      isTrustedInternalI18nRequest("localhost", "", "/api/site/settings"),
    ).toBe(false);
    expect(
      isTrustedInternalI18nRequest(
        "localhost",
        "",
        "/_i18n/8e737cb1/ko/other.json",
      ),
    ).toBe(false);
  });

  it("normalizes FAQ messages without trusting the tm() return type", () => {
    expect(normalizeFaqSchemaItems("home.faq.items", String)).toEqual([]);
    expect(
      normalizeFaqSchemaItems(
        [
          { q: "Question", a: "Answer" },
          { q: "Missing answer" },
          null,
        ],
        String,
      ),
    ).toEqual([{ question: "Question", answer: "Answer" }]);
  });

  it("normalizes a single IP but rejects spoofed address chains", () => {
    expect(normalizeIpAddress("::ffff:203.0.113.4")).toBe("203.0.113.4");
    expect(normalizeIpAddress("203.0.113.4, 10.0.0.1")).toBeNull();
    expect(normalizeIpAddress("999.0.0.1")).toBeNull();
  });

  it("sanitizes raw CMS HTML identically without a browser DOM", () => {
    const payload =
      '<p onclick="steal()">Hello <a href="jav&#x61;script:steal()" target="_blank">link</a></p>' +
      '<img src="https://cdn.example/image.png" onerror="steal()"><script>steal()</script>';
    const output = sanitizeHtml(payload);
    expect(output).toContain("<p>Hello ");
    expect(output).toContain('<a target="_blank" rel="noopener noreferrer">link</a>');
    expect(output).toContain('<img src="https://cdn.example/image.png">');
    expect(output).not.toMatch(/onclick|onerror|javascript:|<script/i);
  });

  it("escapes Tiptap text and rejects dangerous link and image protocols", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "<img src=x onerror=steal()>", marks: [{ type: "link", attrs: { href: "javascript:steal()" } }] },
          ],
        },
        { type: "image", attrs: { src: "javascript:steal()", alt: 'x" onerror="steal()' } },
      ],
    };
    const output = renderTiptap(document);
    expect(output).toContain("&lt;img src=x onerror=steal()&gt;");
    expect(output).not.toMatch(/javascript:|\sonerror="/i);
    expect(renderRichContent(JSON.stringify(document))).toBe(output);
  });

  it("prevents inline JSON and trusted-script HTML parser breakouts", () => {
    const json = serializeJsonForHtml({ name: "</script><script>steal()</script>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ name: "</script><script>steal()</script>" });
    expect(escapeInlineScript('window.x="</script>"')).toBe(
      'window.x="<\\/script>"',
    );
  });
});
