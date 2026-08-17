import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { DOMWrapper } from "@vue/test-utils";
import EvolutionOneToTenConsentModal from "@/components/EvolutionOneToTenConsentModal.vue";
import {
  EVOLUTION_ONE_TO_TEN_GAME_NAME,
  requestEvolutionOneToTenConsent,
  requiresEvolutionOneToTenConsent,
  useEvolutionOneToTenConsent,
} from "@/composables/useEvolutionOneToTenConsent";

describe("Evolution 1:10 launch consent", () => {
  it("only applies to the exact protected game name", () => {
    expect(requiresEvolutionOneToTenConsent(EVOLUTION_ONE_TO_TEN_GAME_NAME)).toBe(true);
    expect(requiresEvolutionOneToTenConsent("Evolution")).toBe(false);
    expect(requiresEvolutionOneToTenConsent("evolution 1:10")).toBe(false);
    expect(requiresEvolutionOneToTenConsent()).toBe(false);
  });

  it("does not resolve confirmation until both consent stages complete", async () => {
    const consent = useEvolutionOneToTenConsent();
    const result = requestEvolutionOneToTenConsent();

    expect(consent.isOpen.value).toBe(true);
    expect(consent.stage.value).toBe("notice");

    consent.continueToConfirmation();
    expect(consent.stage.value).toBe("confirmation");

    consent.confirm();
    await expect(result).resolves.toBe(true);
    expect(consent.isOpen.value).toBe(false);
  });

  it("resolves false when the player cancels", async () => {
    const consent = useEvolutionOneToTenConsent();
    const result = requestEvolutionOneToTenConsent();

    consent.cancel();

    await expect(result).resolves.toBe(false);
    expect(consent.isOpen.value).toBe(false);
  });

  it("requires the localized confirmation word before final agreement", async () => {
    const modal = await mountSuspended(EvolutionOneToTenConsentModal);
    const result = requestEvolutionOneToTenConsent();
    await nextTick();

    const agreeButton = (): DOMWrapper<HTMLButtonElement> => {
      const button = document.querySelector<HTMLButtonElement>("button.tm-btn");
      expect(button).not.toBeNull();
      return new DOMWrapper(button!);
    };

    await agreeButton().trigger("click");
    const inputElement = document.querySelector<HTMLInputElement>("#evolution-consent-input");
    expect(inputElement).not.toBeNull();
    const input = new DOMWrapper(inputElement!);
    const placeholder = input.attributes("placeholder") ?? "";
    const confirmationWord = placeholder.includes("동의") ? "동의" : "Agree";

    await input.setValue("wrong");
    expect(agreeButton().attributes("disabled")).toBeDefined();

    await input.setValue(confirmationWord);
    expect(agreeButton().attributes("disabled")).toBeUndefined();

    await agreeButton().trigger("click");
    await expect(result).resolves.toBe(true);
    modal.unmount();
  });
});
