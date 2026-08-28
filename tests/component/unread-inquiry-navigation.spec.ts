/**
 * The unread-inquiry warning must survive navigation.
 *
 * `useUnreadInquiryGate` lives in the layout, which persists across SPA route
 * changes, so nothing in it re-ran when a member clicked through the site. A
 * reply that arrived after the page loaded therefore went unannounced: the
 * warning fired only on the `false → true` edge of a BOOLEAN flag, and only the
 * websocket ever moved that flag.
 *
 * Two things are asserted here, and they are separate failures:
 *  1. navigation re-asks the server (so a dead socket cannot hide a reply), and
 *  2. navigation re-raises the warning, which opens the inbox on OK.
 */
import { defineComponent, h } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUnreadInquiryGate } from "@/composables/useUnreadInquiryGate";
import { useUiStore } from "~/stores/ui";
import { useAuthStore } from "~/stores/auth";

const { checkUnreadInquiries, showSwalAlert } = vi.hoisted(() => ({
  checkUnreadInquiries: vi.fn(),
  showSwalAlert: vi.fn(),
}));

// Keeps the gate off the network — this spec is about WHEN it asks, not what
// the answer is.
vi.mock("@/composables/useUnreadInquiries", () => ({
  useUnreadInquiries: () => ({ checkUnreadInquiries }),
}));

// The real dialog waits for a click that never comes in a test.
vi.mock("~~/utils/swal-alert", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  showSwalAlert,
}));

const Host = defineComponent({
  setup() {
    useUnreadInquiryGate();
    return () => h("div");
  },
});

/** Mount the gate with a signed-in member and the site notice already settled. */
async function mountGate() {
  const wrapper = await mountSuspended(Host);
  const ui = useUiStore();
  const auth = useAuthStore();

  auth.user.id = "member-1";
  // `isNoticePending()` is fail-closed — an unsettled notice blocks the warning.
  ui.noticeResolved = true;
  await flushPromises();

  return { wrapper, ui };
}

describe("unread-inquiry warning across navigation", () => {
  beforeEach(() => {
    checkUnreadInquiries.mockReset().mockResolvedValue(undefined);
    showSwalAlert.mockReset().mockResolvedValue(undefined);
  });

  it("re-asks the server on every navigation, not just on socket events", async () => {
    const { wrapper } = await mountGate();
    checkUnreadInquiries.mockClear();

    await useRouter().push("/casino");
    await flushPromises();

    // Without this the gate re-reads a flag nothing has refreshed, so a reply
    // that arrived while the socket was down stays invisible forever.
    expect(checkUnreadInquiries).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("warns and opens the inbox when a member navigates with a reply waiting", async () => {
    const { wrapper, ui } = await mountGate();

    ui.setHasUnreadInquiries(true, 1);
    await flushPromises();

    // The arrival warning opened the list; close it to model a member who has
    // dealt with the dialog and is now browsing.
    expect(ui.showInquiryModal).toBe(true);
    ui.setShowInquiryModal(false);
    showSwalAlert.mockClear();

    await useRouter().push("/activity");
    await flushPromises();

    expect(showSwalAlert).toHaveBeenCalled();
    // Pressing OK is what opens the list — the pair `blockedByUnreadInquiries`
    // performs, and the behavior 415491f dropped.
    expect(ui.showInquiryModal).toBe(true);
    wrapper.unmount();
  });

  it("stays quiet once everything is read", async () => {
    const { wrapper, ui } = await mountGate();

    ui.setHasUnreadInquiries(false, 0);
    ui.setShowInquiryModal(false);
    await flushPromises();
    showSwalAlert.mockClear();

    await useRouter().push("/slots");
    await flushPromises();

    expect(showSwalAlert).not.toHaveBeenCalled();
    expect(ui.showInquiryModal).toBe(false);
    wrapper.unmount();
  });
});
