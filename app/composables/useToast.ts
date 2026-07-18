interface ToastOptions {
  description?: string;
  duration?: number;
  style?: Record<string, string>;
  [key: string]: unknown;
}

const defaultStyle: Record<string, string> = {
  background: "#1e1e2e",
  border: "1px solid rgba(113, 30, 219, 0.4)",
  color: "#ffffff",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
  "--normal-bg": "#1e1e2e",
  "--normal-border": "rgba(113, 30, 219, 0.4)",
  "--normal-text": "#ffffff",
  "--description-color": "rgba(255, 255, 255, 0.75)",
};

export const useToast = () => {
  const { $toast } = useNuxtApp();

  return {
    success: (message: string, options: ToastOptions = {}) =>
      $toast.success(message, {
        duration: 4000,
        style: { ...defaultStyle, borderColor: "#04c000" },
        ...options,
      }),

    error: (message: string, options: ToastOptions = {}) =>
      $toast.error(message, {
        duration: 5000,
        style: { ...defaultStyle, borderColor: "#f44336" },
        ...options,
      }),

    info: (message: string, options: ToastOptions = {}) =>
      $toast.info(message, {
        duration: 4000,
        style: { ...defaultStyle, borderColor: "#3b82f6" },
        ...options,
      }),

    warning: (message: string, options: ToastOptions = {}) =>
      $toast.warning(message, {
        duration: 5000,
        style: { ...defaultStyle, borderColor: "#ff9800" },
        ...options,
      }),
  };
};
