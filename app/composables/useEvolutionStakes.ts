/**
 * Whether Evolution's high-stakes (1:10) lobby is on the board.
 *
 * Evolution's two lobbies share one provider code and are told apart by a
 * stakes pill baked into their artwork. The pill on the 1:1 card only means
 * anything while the 1:10 card is beside it, so the card needs to know whether
 * its sibling is actually being shown — see `getLogoImages()`.
 *
 * "Switched off" shows up as ABSENCE, not as a flag: the backend only returns
 * the lobbies a member is permitted to see (`NormalizedLobby.is_active` is
 * carried on the type but consumed nowhere), so a disabled 1:10 simply never
 * arrives in the list.
 */
import { computed, type ComputedRef } from "vue";
import { useGameCatalogStore } from "@/stores/game-catalog";
import { getProviderName, EVOLUTION_PROVIDER_NAME, EVOLUTION_HIGH_STAKES_LOBBY_ID } from "@/utils/gameProviderLogo";

export interface UseEvolutionStakes {
    /** `true` while the 1:10 lobby is among the loaded lobbies. */
    highStakesVisible: ComputedRef<boolean>;
}

/**
 * Reactive view of Evolution's stakes line-up, read from the catalog store.
 *
 * @returns {UseEvolutionStakes} Whether the 1:10 lobby is currently on the board.
 */
export function useEvolutionStakes(): UseEvolutionStakes {
    const catalog = useGameCatalogStore();

    /**
     * Every loaded lobby that resolves to Evolution, across game types. The
     * store keys its cache per game type and Evolution only ships casino
     * lobbies, but scanning all of them keeps this correct if that ever changes.
     */
    const evolutionLobbyIds = computed<string[]>(() =>
        Object.values(catalog.lobbies)
            .flatMap((entry) => entry.data ?? [])
            .filter((lobby) => getProviderName(lobby.gameProvider) === EVOLUTION_PROVIDER_NAME)
            .map((lobby) => lobby.id),
    );

    return {
        /**
         * Defaults to `true` until Evolution lobbies have actually loaded.
         *
         * Reporting "off" from an empty cache would make the 1:1 card paint the
         * unpilled art on first render and then swap to the pilled art once the
         * list arrives — a visible flicker. No Evolution lobbies loaded means no
         * Evolution card is drawn either, so the optimistic default costs
         * nothing.
         */
        highStakesVisible: computed(() => {
            const ids = evolutionLobbyIds.value;
            if (ids.length === 0) return true;
            return ids.includes(EVOLUTION_HIGH_STAKES_LOBBY_ID);
        }),
    };
}
