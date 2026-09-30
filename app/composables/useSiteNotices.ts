/**
 * Shared notices-board cache (`GET /site/notices`) behind NoticeContent — the
 * FAQ modal and the 공지사항 account panel.
 *
 * NoticeContent used to fetch into local state on every mount, so each open
 * painted an empty panel and grew when the list landed. The list now lives
 * here: the modal / panel prefetch it before they are shown (see
 * utils/firstPaintReady.ts), and a mount with cached notices paints them
 * immediately while refreshing in the background.
 */
import { useApi } from "@/composables/useApi";

interface NoticeDto {
  title?: string;
  content?: string;
}

export interface NoticeItem {
  id: number;
  title: string;
  content: string;
}

/** `null` until the first load settles. */
const notices = shallowRef<NoticeItem[] | null>(null);
let inflight: Promise<void> | null = null;

/**
 * Fetch the notices into the shared cache; concurrent calls share one request.
 *
 * @returns {Promise<void>} Resolves when the request settles (never rejects).
 */
export function loadSiteNotices(): Promise<void> {
  if (inflight) return inflight;
  inflight = useApi()<{ data?: NoticeDto[] } | NoticeDto[]>("/site/notices")
    .then((body) => {
      const rows: NoticeDto[] = Array.isArray(body) ? body : (body?.data ?? []);
      notices.value = rows
        .filter((row): row is Required<NoticeDto> => !!row && !!row.title)
        .map((row, idx) => ({ id: idx + 1, title: row.title, content: row.content ?? "" }));
    })
    .catch(() => {
      // Non-critical — the panel renders its empty state.
      if (notices.value === null) notices.value = [];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Reactive view of the shared notices.
 *
 * @returns {object} `notices` (empty until loaded) and `loading` (true only
 *   before the first load settles).
 */
export function useSiteNotices() {
  return {
    notices: computed(() => notices.value ?? []),
    loading: computed(() => notices.value === null),
  };
}
