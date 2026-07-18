import {
  showSuccessAlert,
  showErrorAlert,
  showWarningAlert,
  showLoadingAlert,
} from "~~/utils/swal-alert";

/**
 * Composable wrapper around swal-alert utilities.
 * Provides short aliases used throughout game components.
 */
export function useSwalHelpers() {
  return {
    swalSuccess: showSuccessAlert,
    swalError: showErrorAlert,
    swalWarning: showWarningAlert,
    swalLoading: showLoadingAlert,
  };
}
