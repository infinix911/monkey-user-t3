import { ref } from "vue";

/** The provider/lobby name that requires the additional launch acknowledgement. */
export const EVOLUTION_ONE_TO_TEN_GAME_NAME = "Evolution 1:10";

type ConsentStage = "notice" | "confirmation";

const isOpen = ref(false);
const stage = ref<ConsentStage>("notice");
const typedConfirmation = ref("");
let settleRequest: ((confirmed: boolean) => void) | null = null;

/** True only for the exact backend game/lobby name covered by the policy. */
export const requiresEvolutionOneToTenConsent = (gameName?: string): boolean =>
  gameName === EVOLUTION_ONE_TO_TEN_GAME_NAME;

/**
 * Opens the two-step acknowledgement flow and resolves after the player either
 * completes it or abandons it. A second click while it is already visible is
 * ignored so it cannot create a second pending launch.
 */
export const requestEvolutionOneToTenConsent = (): Promise<boolean> => {
  if (isOpen.value) return Promise.resolve(false);

  isOpen.value = true;
  stage.value = "notice";
  typedConfirmation.value = "";

  return new Promise<boolean>((resolve) => {
    settleRequest = resolve;
  });
};

const finish = (confirmed: boolean): void => {
  if (!isOpen.value) return;
  const resolve = settleRequest;
  settleRequest = null;
  isOpen.value = false;
  typedConfirmation.value = "";
  resolve?.(confirmed);
};

/** State/actions consumed by the single globally mounted consent modal. */
export const useEvolutionOneToTenConsent = () => ({
  isOpen,
  stage,
  typedConfirmation,
  continueToConfirmation: () => {
    stage.value = "confirmation";
  },
  cancel: () => finish(false),
  confirm: () => finish(true),
});
