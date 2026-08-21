import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import InquiryContent from "@/components/inquiry/InquiryContent.vue";

const { patch } = vi.hoisted(() => ({
  patch: vi.fn(),
}));

vi.mock("~/lib/axios-client", () => ({
  default: { patch },
}));

vi.mock("~~/utils/swal-alert", () => ({
  showSuccessAlert: vi.fn(),
  showErrorAlert: vi.fn(),
  showConfirmationAlert: vi.fn(),
}));

const mutations = readFileSync(
  resolve(__dirname, "../../app/composables/useInquiryMutations.ts"),
  "utf8",
);
const content = readFileSync(
  resolve(__dirname, "../../app/components/inquiry/InquiryContent.vue"),
  "utf8",
);

describe("inquiry read-all action", () => {
  it("uses the explicit bulk read API action instead of a numeric status", () => {
    const bulkMutation = mutations.slice(
      mutations.indexOf("const updateAllInquiriesStatus"),
      mutations.indexOf("const requestBankAccount"),
    );

    expect(content).toContain('updateAllInquiriesStatus("read")');
    expect(bulkMutation).toContain('const isMarkRead = status === "read";');
    expect(bulkMutation).not.toContain("const isMarkRead = status === 4;");
  });

  it("keeps the account-wide action available when the current page has no unread ticket", () => {
    const readAllHandler = content.slice(
      content.indexOf("const handleReadAll"),
      content.indexOf("const handleDeleteAll"),
    );

    expect(content).not.toContain(':disabled="!hasUnread"');
    expect(readAllHandler).not.toContain("if (!hasUnread.value) return;");
  });

  it("sends the bulk read action and refreshes the inquiry feed", async () => {
    patch.mockResolvedValue({ data: { message: "INQUIRY_READ_STATUS_UPDATED" } });
    const refresh = vi.fn().mockResolvedValue(undefined);
    const wrapper = await mountSuspended(InquiryContent, {
      props: {
        inquiryData: { pages: 1, rows: 0, data: [] },
        onRefresh: refresh,
      },
    });

    await wrapper.find("button").trigger("click");

    expect(patch).toHaveBeenCalledWith("/inquiries/", { status: "read" });
    expect(refresh).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
