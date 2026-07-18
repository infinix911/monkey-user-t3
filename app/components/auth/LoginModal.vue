<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
        @click.self="handleBackdropClick">
        <!-- Login Modal Wrapper -->
        <div ref="modalRef" class="login-modal-wrapper relative flex w-full max-w-[460px] flex-col items-center">
          <!-- Close Button -->
          <button type="button"
            class="absolute right-0 top-0 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer sm:h-10 sm:w-10"
            :aria-label="$t('common.close')" @click="handleClose">
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Logo -->
          <NuxtImg :src="logoSrc" :alt="siteConfig.identity.siteName"
            class="login-logo w-[220px] sm:w-[300px] drop-shadow-2xl" :style="logoStyle" loading="eager" />

          <!-- Login Card — border + panel theming come from the shared
               `.modal-gradient-border` / `.tm-modal` classes fed by
               theme.loginModal (dedicated login-modal theme keys). -->
          <div
            class="tm-modal modal-gradient-border login-card relative w-full overflow-hidden rounded-[16px] px-7 pt-[45px] pb-[26px] sm:px-9"
            :style="borderStyle">
            <!-- Login Form -->
            <form class="relative z-10 flex flex-col gap-4" @submit.prevent="onSubmit">
              <div class="flex gap-3 items-stretch">
                <div class="flex min-w-0 flex-1 flex-col gap-4">
                  <!-- Username Field -->
                  <div class="relative">
                    <input id="login-username" v-model="username" type="text" maxlength="32" autocomplete="username"
                      :placeholder="$t('auth.idPlaceHolder')" class="w-full focus:outline-none"
                      :class="{ 'ring-2 ring-red-500': errors.username }" :style="inputStyle">
                  </div>

                  <!-- Password Field -->
                  <div class="relative">
                    <input id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'"
                      maxlength="128" autocomplete="current-password" :placeholder="$t('auth.passPlaceHolder')"
                      class="w-full focus:outline-none" :class="{ 'ring-2 ring-red-500': errors.password }"
                      :style="passwordInputStyle">
                    <button type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800" :aria-label="showPassword
                        ? $t('login.hidePassword')
                        : $t('login.showPassword')
                        " @click="togglePasswordVisibility">
                      <!-- Eye Icon (show) -->
                      <svg v-if="!showPassword" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <!-- Eye Off Icon (hide) -->
                      <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Login Button — a narrow portrait box that stretches to match
                     the stacked inputs. The loading label is absolutely positioned
                     (out of flow) with a smaller font so the longer text fits
                     without widening the button. -->
                <button type="submit" :disabled="isSubmitting || !isFormValid"
                  class="relative flex items-center justify-center w-[92px] sm:w-[104px] shrink-0 disabled:cursor-not-allowed transition-transform active:scale-[0.98] whitespace-nowrap"
                  :style="buttonStyle">
                  <span :class="{ invisible: isSubmitting }">
                    {{ $t("login.loginButton") }}
                  </span>
                  <span class="absolute inset-0 flex items-center justify-center text-sm"
                    :class="{ invisible: !isSubmitting }">
                    {{ $t("login.loggingIn") }}
                  </span>
                </button>
              </div>

              <!-- Inline validation messages -->
              <span v-if="errors.username || errors.password" class="block text-red-400 text-[13px] leading-tight">
                {{ errors.username || errors.password }}
              </span>

              <!-- Sign Up Link -->
              <div class="mt-1 flex items-center justify-center gap-2 whitespace-nowrap">
                <span class="login-signup-text">{{ $t("login.noAccount") }}</span>
                <button type="button" class="login-signup-link bg-transparent border-0 cursor-pointer hover:opacity-80"
                  :style="{ color: dep.accentColor }" @click="handleSignupClick">
                  {{ $t("login.signUpLink") }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useForm } from "vee-validate";
import { useApi } from "@/composables/useApi";
import { useToast } from "@/composables/useToast";
import { loginSchema } from "@/schemas";
import { useWebSocketStore } from "@/stores/websocket";
import { showErrorAlert } from "~~/utils/swal-alert";

const authStore = useAuthStore();
const uiStore = useUiStore();

const { t, locale } = useI18n();
const wsStore = useWebSocketStore();
const siteConfig = useSiteConfig();

// Props
interface LoginModalProps {
  isOpen: boolean;
}

const props = defineProps<LoginModalProps>();

// Emits
const emit = defineEmits<{
  close: [];
  signupClick: [];
}>();

// VeeValidate form
const { handleSubmit, errors, defineField, resetForm } = useForm({
  // Reactive schema so validation messages follow the active locale (they are
  // baked into the zod schema, so a static schema freezes the first language).
  validationSchema: computed(() => {
    void locale.value;
    return loginSchema(t);
  }),
});

const [username] = defineField("username");
const [password] = defineField("password");

const showPassword = ref(false);
const isSubmitting = ref(false);
const modalRef = ref<HTMLElement | null>(null);

// Computed
const isFormValid = computed(() => {
  return (
    (username.value?.trim() ?? "") !== "" &&
    (password.value?.trim() ?? "") !== ""
  );
});

const isMobile = computed(() => uiStore.isMobile);

const logoSrc = computed(() => {
  if (isMobile.value) {
    return siteConfig.identity.logoMobile || siteConfig.identity.logo;
  }
  return siteConfig.identity.logo;
});

// Login-modal logo styling (spacing, etc.) from the theme config. The
// responsive width stays on the Tailwind classes; only the theme-driven
// overrides (e.g. margin-bottom) come from theme.logoStyles.loginModal.
const logoStyle = computed(() => siteConfig.theme.logoStyles.loginModal);

// Dedicated login-modal theme (theme.loginModal) drives the card's border,
// glow and primary button. Kept separate from the deposit/withdraw modals so
// the login screen can be re-skinned on its own from the CMS.
const dep = computed(() => siteConfig.theme.loginModal);

// Panel border + glow — fed to the shared `.modal-gradient-border` / `.tm-modal`
// classes (main.css). The gradient glows in the centre and fades at the corners.
const borderStyle = computed(() => ({
  "--body-bg": dep.value.modalBgColor,
  "--b-mid": dep.value.borderColor,
  "--b-accent": dep.value.accentColor,
  "--tm-input-ph": "rgba(0, 0, 0, 0.5)",
  "--tm-accent": dep.value.accentColor,
  "--login-band-grad": dep.value.bandGradient,
}));

const inputStyle = computed(() => ({
  width: "100%",
  height: "44px",
  padding: "0 16px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#D9D9D9",
  color: "#1c1c1c",
  fontFamily: "var(--font-line-seed)",
}));

// Password input needs extra right padding so its text/placeholder clears the
// eye toggle icon. Inline styles win over Tailwind's `pr-12`, so we set it here.
const passwordInputStyle = computed(() => ({
  ...inputStyle.value,
  paddingRight: "44px",
}));

const buttonStyle = computed(() => ({
  color: dep.value.buttonTextColor,
  textAlign: "center" as const,
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: "normal",
  borderRadius: "8px",
  background: isSubmitting.value ? "#9CA3AF" : dep.value.buttonGradientColor,
  alignSelf: "stretch",
}));

// Methods
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true;

  try {
    // Login — server sets bn.session cookie on success
    const api = useApi();
    await api("/auth/login", {
      method: "POST",
      body: {
        username: values.username,
        password: values.password,
      },
    });

    // Hydrate auth + notice on the same tick the modal closes, so the user
    // never sees the page repaint as logged-out between login and notice.
    // Previously we did window.location.reload(); but SSR on Cloudflare
    // Pages can't see the cookie (API-domain scoped), so the reload
    // produced ~4 visible state changes (blank → anonymous SSR →
    // authenticated swap → notice). See PLAN-LOGIN-RELOAD-BLINK.md.
    try {
      await authStore.verifyUser();
    } catch {
      // Verify shouldn't fail right after a 200 login, but if it does
      // (e.g. /auth/v 500s) fall back to the legacy reload path so we
      // don't leave the user in an inconsistent state.
      if (typeof window !== "undefined") {
        window.location.reload();
        return;
      }
    }
    await uiStore.fetchNotice();
    wsStore.connect();

    // The login flow intentionally never reloads (see the comment above), so the
    // guest session's scroll position would otherwise persist. Logging in from the
    // footer/bottom of the page would then leave it scrolled down with the header
    // stuck in its sticky (scrolled) state. Reset to the top — AppHeader's scroll
    // listener flips `isScrolled` back off in response to this programmatic scroll,
    // so the navbar repaints in its normal non-sticky state.
    //
    // The open modal locked body scroll (`overflow: hidden`), which makes
    // `scrollTo` a no-op. Release the lock first so the scroll actually lands at
    // the top and fires the scroll event AppHeader listens for. The isOpen
    // watcher will also clear overflow when the modal closes; doing it here just
    // ensures the page is scrollable at the moment we scroll.
    if (typeof window !== "undefined") {
      document.body.style.overflow = "";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    resetForm();
    emit("close");
  } catch (err: unknown) {
    // Handle specific error codes or show generic error
    const fetchErr = err as { data?: { message?: string } };
    const errorKey = fetchErr?.data?.message;
    const errorMessage = errorKey
      ? t(`login.apiMessages.${errorKey}`)
      : t("login.invalidCredentials");

    await showErrorAlert(t("login.failed"), errorMessage);
  } finally {
    isSubmitting.value = false;
  }
});

const handleClose = () => {
  // Reset form state
  resetForm();
  showPassword.value = false;

  emit("close");
};

const handleBackdropClick = () => {
  handleClose();
};

const handleSignupClick = () => {
  handleClose();
  emit("signupClick");
};

// Close modal on ESC key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.isOpen) {
    handleClose();
  }
};

// Watch for modal open/close
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      // Add escape key listener
      document.addEventListener("keydown", handleKeydown);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      // Remove escape key listener
      document.removeEventListener("keydown", handleKeydown);
      // Restore body scroll
      document.body.style.overflow = "";
      // Reset password visibility
      showPassword.value = false;
    }
  },
);

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
});
</script>

<style scoped>
/* The card frame + glow come from the shared `.modal-gradient-border` /
   `.tm-modal` classes in main.css, themed via the theme.loginModal CSS vars set
   in `borderStyle`. Only the login-specific top accent glow lives here. */
.login-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 22%;
  border-radius: inherit;
  pointer-events: none;
  /* Warm-to-dark band: orange at the top fading to near-black around the top of
     the inputs. Driven by theme.loginModal.bandGradient (CMS-overridable); the
     fallback keeps the band if an older config has no bandGradient key. */
  background: var(
    --login-band-grad,
    linear-gradient(
      180deg,
      #d67a12 0%,
      #b95a00 20%,
      #7a3200 45%,
      #2c1200 70%,
      #02010a 100%
    )
  );
}

.login-signup-text {
  color: #e5e5e5;
  font-family: var(--font-line-seed);
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.3px;
}

.login-signup-link {
  font-family: var(--font-line-seed);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.4px;
  text-decoration-line: underline;
  text-underline-offset: 2px;
}

#login-username::placeholder,
#login-password::placeholder {
  color: rgba(0, 0, 0, 0.5);
  font-family: var(--font-line-seed);
  font-size: 16px;
  font-weight: 400;
  opacity: 1;
}

#login-username,
#login-password {
  box-sizing: border-box;
}

/* Modal open/close transition ("modal") is defined globally in
   app/assets/css/main.css so every modal shares the same subtle fade+scale. */
</style>
