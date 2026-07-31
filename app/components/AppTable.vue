<template>
  <div class="tm-card rounded-lg overflow-hidden min-w-0 flex-1 min-h-0">
    <div class="overflow-auto h-full">
      <table class="app-table w-full lg:min-w-max">
        <thead>
          <tr class="tm-thead">
            <th v-for="col in columns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="app-state text-white">{{ loadingText }}</td>
          </tr>
          <tr v-else-if="error">
            <td :colspan="columns.length" class="app-state text-red-400">{{ error }}</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td :colspan="columns.length" class="app-state tm-muted">{{ emptyText }}</td>
          </tr>
          <template v-else>
            <tr
              v-for="(row, index) in rows" :key="index"
              class="tm-row tm-row-hover tm-line border-b last:border-b-0 transition-colors">
              <slot name="row" :row="row" :index="index" />
            </tr>
            <!-- Totals or any other summary line, supplied as <td>s. Inside the
                 body rather than a <tfoot> so it scrolls with the rows it sums
                 instead of pinning to the bottom of the scroll region. -->
            <tr v-if="$slots.footer" class="tm-row tm-line border-t">
              <slot name="footer" />
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The shared table shell for account and transaction panels.
 *
 * Five sections had each rebuilt this same markup — wrapper, `tm-thead` header,
 * `tm-row`/`tm-line` body, loading and empty rows — and they had drifted apart
 * on padding, font size and cell alignment. This owns that chrome so they can
 * only look alike.
 *
 * Cells stay with the caller through the `row` slot, because what a cell
 * contains is the one thing that genuinely differs per table. Their padding and
 * typography are applied from here (see the scoped `td` rules), so a caller
 * supplies `<td>{{ value }}</td>` and gets the shared look without repeating
 * class strings.
 */
defineProps<{
  /** Header labels, already translated. Also sets the colspan for the states. */
  columns: string[];
  /** Row objects. Rendering is delegated to the `row` slot. */
  rows: readonly Record<string, unknown>[];
  /** Shows the loading row instead of the body. */
  loading?: boolean;
  /** Message for the loading row. */
  loadingText?: string;
  /** Message when there are no rows and loading has finished. */
  emptyText?: string;
  /** Message for a failed load. Takes precedence over the empty row. */
  error?: string | null;
}>();

defineSlots<{
  row(props: { row: Record<string, unknown>; index: number }): unknown;
  /** Optional summary line rendered after the rows, e.g. column totals. */
  footer?(): unknown;
}>();
</script>

<style scoped>
/* Header and cell chrome live here rather than on every caller's markup, which
   is what keeps the tables uniform. `:deep` is needed because the cells are
   supplied through the slot and so carry the caller's scope, not this one. */
.app-table :deep(th) {
  padding: 0.375rem 0.25rem;
  text-align: center;
  font-family: var(--font-line-seed);
  font-weight: 600;
  font-size: 11px;
  line-height: 1.25;
  color: #fff;
  white-space: normal;
}

.app-table :deep(td) {
  padding: 0.375rem 0.5rem;
  text-align: center;
  font-family: var(--font-line-seed);
  font-size: 12px;
  color: rgb(255 255 255 / 0.85);
  vertical-align: middle;
}

.app-table :deep(.app-state) {
  padding: 2rem 0.5rem;
  font-size: 13px;
}

@media (min-width: 1024px) {
  .app-table :deep(th) {
    font-size: 14px;
    white-space: nowrap;
  }

  .app-table :deep(td) {
    font-size: 14px;
  }
}
</style>
