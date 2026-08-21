import { flushPromises } from "@vue/test-utils";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InquiryContent from "@/components/inquiry/InquiryContent.vue";
import NoticeContent from "@/components/notice/NoticeContent.vue";

const { api } = vi.hoisted(() => ({
  api: vi.fn(),
}));

vi.mock("@/composables/useApi", () => ({
  useApi: () => api,
}));

describe("collapsed notice and inquiry lists", () => {
  beforeEach(() => {
    api.mockResolvedValue({
      data: [
        { title: "First notice", content: "First notice body" },
        { title: "Second notice", content: "Second notice body" },
      ],
    });
  });

  it("keeps every notice closed when the list first loads", async () => {
    const wrapper = await mountSuspended(NoticeContent);
    await flushPromises();

    expect(wrapper.findAll("button").every((button) => button.classes().includes("tm-row"))).toBe(true);
    expect(wrapper.findAll('[class*="max-h-0"]')).toHaveLength(2);
    wrapper.unmount();
  });

  it("does not auto-expand an inquiry when its data arrives", async () => {
    const wrapper = await mountSuspended(InquiryContent, {
      props: {
        inquiryData: { pages: 1, rows: 0, data: [] },
      },
    });

    await wrapper.setProps({
      inquiryData: {
        pages: 1,
        rows: 1,
        data: [
          {
            id: "first-inquiry",
            title: "First inquiry",
            message: "First inquiry body",
            status: 1,
            created_at: "2026-08-22 00:00:00",
            updated_at: "2026-08-22 00:00:00",
            replies_count: 0,
            member_unread: 0,
            created_by_type: "member",
            last_reply_by: "member",
          },
        ],
      },
    });

    expect(wrapper.text()).not.toContain("First inquiry body");
    wrapper.unmount();
  });
});
