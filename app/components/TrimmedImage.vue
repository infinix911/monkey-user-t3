<template>
  <!-- Auto-trimmed image: shows only the opaque content of `src` (its transparent
       whitespace cropped away), at the content's natural aspect ratio. The caller
       sets the HEIGHT (via class); the width is derived from the trimmed content
       (capped by `maxWidth`). Falls back to plain object-fit before measuring and
       if the canvas is cross-origin tainted. -->
  <span ref="boxRef" class="block relative overflow-hidden" :style="boxStyle">
    <img ref="imgRef" :src="src" :alt="alt" :loading="loading" decoding="async" :style="imgStyle" @load="onLoad"
      @error="$emit('error')">
  </span>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from "vue";

type Bbox = { fx: number; fy: number; fw: number; fh: number };

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    /** Max box width in px (the height comes from the caller's class). */
    maxWidth?: number;
    /** "height" (default): fill the height, width follows aspect (capped by
        maxWidth, side-cropping the rare extra-wide logo). "contain": fit inside
        BOTH the height and maxWidth — never crops; wide logos just render shorter. */
    fit?: "height" | "contain";
    /** Horizontal alignment of the trimmed content inside the box. */
    align?: "center" | "left";
    loading?: "lazy" | "eager";
  }>(),
  { alt: "", maxWidth: 0, fit: "height", align: "center", loading: "lazy" },
);

defineEmits<{ error: [] }>();

// Per-src cache so each image's content box is scanned only once per session.
const cache: Map<string, Bbox | null> = ((
  globalThis as unknown as { __trimBboxCache?: Map<string, Bbox | null> }
).__trimBboxCache ??= new Map());

const boxRef = ref<HTMLElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);

// Box width. In "height" mode the box sizes to the trimmed content (a fallback
// until measured). In "contain" mode the caller controls the width (e.g. w-full),
// so we leave it alone and just fit the content inside that available width.
const boxStyle = reactive<Record<string, string>>(
  props.fit === "contain" ? {} : { width: props.maxWidth ? `${props.maxWidth}px` : "120px" },
);

// Pre-measure fallback: object-fit fill of the box. maxWidth/Height none defeats
// Tailwind Preflight's `img { max-width: 100% }`, which would otherwise cap our
// upscaled image to the box width and crop the content.
const imgStyle = reactive<Record<string, string>>({
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  maxWidth: "none",
  maxHeight: "none",
  objectFit: "contain",
});

// Size the box to the content's aspect (off the stable height) and position the
// image so the trimmed content fills it, centered. clientHeight is read because
// it's fixed by the caller's height class and unaffected by our width changes.
function applyBbox(bb: Bbox | null) {
  const box = boxRef.value;
  const img = imgRef.value;
  if (!box || !img || !bb || !img.naturalWidth) return;
  const ch = box.clientHeight;
  if (!ch) return;
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const contentW = bb.fw * natW;
  const contentH = bb.fh * natH;
  if (!contentW || !contentH) return;

  const naturalW = ch * (contentW / contentH);
  let cw: number;
  let k: number;
  if (props.fit === "contain") {
    // Fit inside the box's ACTUAL available width (set by the caller, e.g.
    // w-full) and the height → never crops, and adapts responsively. maxWidth, if
    // given, is an extra cap.
    const avail = Math.min(
      box.clientWidth || naturalW,
      props.maxWidth || Infinity,
    );
    k = Math.min(ch / contentH, avail / contentW);
    cw = box.clientWidth || contentW * k;
  } else {
    // Fill the height; width follows aspect (capped by maxWidth, side-cropping
    // only the rare extra-wide logo).
    cw = Math.min(naturalW, props.maxWidth || Infinity);
    k = ch / contentH;
    boxStyle.width = `${Math.round(cw)}px`;
  }
  const contentLeft = bb.fx * natW * k;
  const contentTop = bb.fy * natH * k;
  // Horizontal slack between the box and the trimmed content; left-align pins it
  // to the box's left edge, otherwise centre it.
  const slackX = props.align === "left" ? 0 : (cw - contentW * k) / 2;
  Object.assign(imgStyle, {
    width: `${natW * k}px`,
    height: `${natH * k}px`,
    left: `${slackX - contentLeft}px`,
    top: `${(ch - contentH * k) / 2 - contentTop}px`,
    inset: "",
    objectFit: "fill",
  });
}

// Scan the alpha channel (downsampled for speed) for the opaque bounding box.
function measure() {
  const img = imgRef.value;
  if (!img || !img.naturalWidth) return;
  const cached = cache.get(props.src);
  if (cached !== undefined) {
    applyBbox(cached);
    return;
  }
  try {
    // Scan at a fairly high resolution so faint/thin parts (small wordmark text)
    // aren't missed, which would otherwise crop the content too tight.
    const SCAN_W = 360;
    const sw = Math.min(SCAN_W, img.naturalWidth);
    const sh = Math.max(1, Math.round((img.naturalHeight * sw) / img.naturalWidth));
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, sw, sh);
    const d = ctx.getImageData(0, 0, sw, sh).data;
    let minX = sw, minY = sh, maxX = -1, maxY = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (d[(y * sw + x) * 4 + 3] > 6) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      cache.set(props.src, null);
      return;
    }
    const bb: Bbox = {
      fx: minX / sw,
      fy: minY / sh,
      fw: (maxX - minX + 1) / sw,
      fh: (maxY - minY + 1) / sh,
    };
    cache.set(props.src, bb);
    applyBbox(bb);
  } catch {
    cache.set(props.src, null);
  }
}

function onLoad() {
  nextTick(measure);
}

let ro: ResizeObserver | null = null;
onMounted(() => {
  const img = imgRef.value;
  if (img?.complete && img.naturalWidth) measure();
  if (typeof ResizeObserver !== "undefined" && boxRef.value) {
    ro = new ResizeObserver(() => {
      const bb = cache.get(props.src);
      if (bb) applyBbox(bb);
    });
    ro.observe(boxRef.value);
  }
});
onUnmounted(() => ro?.disconnect());

watch(
  () => props.src,
  () => {
    Object.assign(imgStyle, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      left: "",
      top: "",
      objectFit: "contain",
    });
    nextTick(measure);
  },
);
</script>
