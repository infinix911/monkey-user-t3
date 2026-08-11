/**
 * InquiryCard message rendering.
 *
 * Admin replies are authored in the console's rich-text box and stored as HTML,
 * while member replies are plain textarea text and older messages are Tiptap
 * JSON. All three reach the same bubble. The HTML case used to be interpolated
 * as text, so an operator reply rendered as its literal source on screen
 * (`<p>New Reply Template</p>`); these tests pin all three shapes plus the
 * sanitizer boundary.
 */
import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import InquiryCard from "@/components/inquiry/InquiryCard.vue";
import type {
  InquiryItem,
  RepliesResponse,
} from "@/interfaces/inquiry.interface";

const inquiry: InquiryItem = {
  id: "1",
  title: "Bank account request",
  message: "Please add my account",
  status: 2,
  created_at: "2026-08-07 22:36:13",
  updated_at: "2026-08-07 22:36:13",
  replies_count: 1,
  member_unread: 0,
  created_by_type: "member",
  last_reply_by: "admin",
};

const repliesWith = (message: string, senderType = "admin"): RepliesResponse => ({
  has_more: false,
  prev_cursor: "",
  next_cursor: "",
  data: [
    {
      id: "r1",
      sender_type: senderType,
      sender_id: "",
      sender: "",
      message,
      created_at: "2026-08-08 09:00:00",
    },
  ],
});

const mountWith = (replies: RepliesResponse, message = inquiry.message) =>
  mountSuspended(InquiryCard, {
    props: {
      inquiry: { ...inquiry, message },
      isExpanded: true,
      replies,
      isLoadingReplies: false,
      isClosing: false,
    },
  });

describe("InquiryCard message rendering", () => {
  it("renders an admin HTML reply as markup, not as its source text", async () => {
    const card = await mountWith(repliesWith("<p>New Reply Template</p>"));

    expect(card.text()).not.toContain("<p>");
    expect(card.text()).toContain("New Reply Template");
    expect(card.html()).toContain("<p>New Reply Template</p>");
  });

  it("keeps the structure of a multi-block admin reply", async () => {
    const card = await mountWith(
      repliesWith("<p>Hello</p><ul><li>first</li><li>second</li></ul>"),
    );

    const html = card.html();
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
    expect(card.text()).not.toContain("<li>");
  });

  it("renders Tiptap JSON replies through the same path", async () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "tiptap body", marks: [{ type: "bold" }] }],
        },
      ],
    });
    const card = await mountWith(repliesWith(doc));

    expect(card.html()).toContain("<strong>tiptap body</strong>");
    expect(card.text()).not.toContain("{");
  });

  it("escapes member-typed text and keeps its line breaks", async () => {
    const card = await mountWith(repliesWith("5 < 10\nsecond line", "member"));

    const html = card.html();
    expect(html).toContain("5 &lt; 10<br>second line");
  });

  it("strips scripts and event handlers from stored markup", async () => {
    const card = await mountWith(
      repliesWith('<p onclick="alert(1)">ok</p><img src=x onerror=alert(1)>'),
    );

    const html = card.html();
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onerror");
    expect(html).toContain("<p>ok</p>");
  });

  it("still renders app-raised inquiry bodies through i18n, not as markup", async () => {
    const card = await mountWith(repliesWith("<p>ok</p>"), "BANK_ACCOUNT_REQUEST");

    // The token is looked up in `inquiry.apiMessages.*`; either way the raw
    // token must not survive to the screen as an unstyled shout.
    expect(card.text()).not.toContain("<p>");
  });
});
