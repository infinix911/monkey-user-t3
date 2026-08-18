<template>
  <template v-if="!isTruncated">{{ display }}</template>
  <template v-else>
    <button
      ref="trigger"
      type="button"
      class="tm-id-chip cursor-pointer underline decoration-dotted underline-offset-2 tabular-nums"
      :aria-expanded="open"
      :aria-label="t('activity.columns.id')"
      :title="display"
      @click.stop="toggle">{{ short }}</button>

    <!-- Teleported and `fixed`: the table sits inside two nested overflow
         containers (AppTable's `overflow-hidden` shell and its `overflow-auto`
         scroller), so a bubble positioned inside the cell would be clipped by
         both. Fixed coordinates measured off the trigger escape them. -->
    <Teleport to="body">
      <div
        v-if="open"
        class="tm-id-pop fixed z-[200] max-w-[calc(100vw-1rem)] rounded-lg px-3 py-2 text-[12px] leading-snug break-all shadow-lg"
        :style="popStyle"
        role="tooltip">{{ display }}</div>
      <!-- The arrow is a sibling, not a pseudo-element on the bubble: the bubble
           is placed by its own left edge (and flipped with translateX when it
           would run off the right of the screen), so its box is not a fixed
           offset from the trigger. Positioning the arrow from the trigger's own
           centre is what keeps it pointing at the id rather than drifting. -->
      <div
        v-if="open"
        class="tm-id-arrow fixed z-[201]"
        :class="arrowUp ? 'is-up' : 'is-down'"
        :style="arrowStyle"
        aria-hidden="true" />
    </Teleport>
  </template>
</template>

<script setup lang="ts">
/**
 * An identifier in a table cell: shortened to a stub, with the whole value one
 * tap away.
 *
 * Game rows carry a provider's own transaction token, which runs long enough
 * (30+ characters) that the narrow `번호` column on a phone broke it one
 * character per line and pushed the row's real content — provider, bet, win,
 * balance — into a sliver. The stub keeps the column to a fixed width; the
 * value is still there, behind a tap.
 *
 * A tap rather than a hover, because this exists for the phone and there is no
 * hover there. `title` is set as well, so a desktop pointer gets the value
 * without the tap.
 *
 * Truncation is opt-in via `truncate`, not a length heuristic: the transaction
 * tab shows short numeric ids, and several comma-separated at that, where a
 * stub would hide more than it saves.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    /** Display value as the table built it, `#` prefix included. */
    value: string;
    /** Shorten to a stub. Off for columns whose ids are already short. */
    truncate?: boolean;
    /** Characters of the id to keep, after the `#`. */
    keep?: number;
  }>(),
  { truncate: false, keep: 4 },
);

const { t } = useI18n();

const display = computed(() => String(props.value ?? ""));

/** `#6a7b…` — the `#` is chrome, so the kept characters are counted after it. */
const short = computed(() => {
  const raw = display.value.startsWith("#") ? display.value.slice(1) : display.value;
  return `#${raw.slice(0, props.keep)}...`;
});

/** Only worth a stub when the stub is actually shorter than the value. */
const isTruncated = computed(
  () => props.truncate && display.value.length > short.value.length,
);

const open = ref(false);
const trigger = ref<HTMLElement | null>(null);
const popStyle = ref<Record<string, string>>({});
const arrowStyle = ref<Record<string, string>>({});
/** Bubble above the trigger, so the arrow points down out of its underside. */
const arrowUp = ref(false);

/**
 * Positions the bubble ABOVE the trigger, clamped to the viewport.
 *
 * Above, because below covered the next row - the thing a member is most likely
 * comparing the id against - and on a phone it also landed under the thumb that
 * had just tapped. It flips below only when the trigger sits too close to the
 * top of the screen for the bubble to fit, which is the first row or two.
 *
 * Anchoring with `bottom` rather than `top` is what makes "above" possible in
 * one pass: the bubble's own height is not known until it has rendered, and
 * `bottom` does not need it.
 *
 * Measured on open (and on scroll/resize while open) rather than tracked
 * continuously: the value cannot change while it is showing, so there is
 * nothing to keep in sync beyond where the trigger moved to.
 */
function place() {
  const el = trigger.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const GAP = 6;
  // Enough room for a two-line bubble plus the gap; below that it goes under.
  const fitsAbove = r.top > 64;
  const ARROW = 10;
  arrowUp.value = fitsAbove;
  popStyle.value = {
    ...(fitsAbove
      ? { bottom: `${window.innerHeight - r.top + GAP}px` }
      : { top: `${r.bottom + GAP}px` }),
    left: `${Math.max(8, Math.min(r.left, window.innerWidth - 8))}px`,
    transform: r.left > window.innerWidth / 2 ? "translateX(-100%)" : "none",
  };
  // Centred on the trigger and straddling the bubble's edge, so its unbordered
  // half covers the bubble's own border and the two read as one shape.
  arrowStyle.value = {
    left: `${r.left + r.width / 2}px`,
    top: `${(fitsAbove ? r.top - GAP : r.bottom + GAP) - ARROW / 2}px`,
  };
}

function close() {
  open.value = false;
}

function toggle() {
  open.value = !open.value;
  if (open.value) place();
}

// Any scroll moves the trigger out from under the bubble, and the table itself
// scrolls, so close rather than chase it. `capture` catches the inner scroller
// too, which does not bubble its scroll event to the window.
const onScroll = () => close();
const onDocClick = () => close();
const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") close();
};

watch(open, (isOpen) => {
  const method = isOpen ? "addEventListener" : "removeEventListener";
  document[method]("click", onDocClick);
  document[method]("keydown", onKey as EventListener);
  window[method]("scroll", onScroll, true);
  window[method]("resize", onScroll);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onKey as EventListener);
  window.removeEventListener("scroll", onScroll, true);
  window.removeEventListener("resize", onScroll);
});
</script>

<style scoped>
.tm-id-chip {
  color: inherit;
}

/* Fixed colours rather than the `--tm-*` panel tokens, and deliberately so:
   the bubble is teleported to <body>, which puts it outside the element that
   spreads those tokens (useModalTheme sets them on the modal host), so any
   `var(--tm-…)` here would only ever resolve to its fallback. Black with white text, per the
   brief; if it ever needs
   to follow the CMS theme properly, it has to be teleported inside the themed
   host instead - and then it is back inside the overflow that made the teleport
   necessary. */
/* A rotated square rather than a border triangle: it needs a 1px edge to match
   the bubble's, and only a real border can carry one. Two of its four borders
   are drawn - the pair facing away from the bubble - so the half sitting on top
   of the bubble contributes no line across it. */
.tm-id-arrow {
  width: 10px;
  height: 10px;
  background: #000;
  transform: translateX(-50%) rotate(45deg);
}

.tm-id-arrow.is-up {
  border-right: 1px solid rgba(255, 255, 255, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.tm-id-arrow.is-down {
  border-left: 1px solid rgba(255, 255, 255, 0.18);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}

.tm-id-pop {
  background: #000;
  color: #fff;
  /* A hairline border because the bubble is black on a near-black panel - with
     nothing but the shadow it loses its edges against the table behind it. */
  border: 1px solid rgba(255, 255, 255, 0.18);
}
</style>
