<template>
  <div class="py-6 lg:max-w-4xl mx-auto">
    <div class="flex flex-col gap-4">
      <div
        v-for="method in contactMethods"
        :key="method.id"
        class="flex items-start w-full gap-2"
      >
        <!-- Icon -->
        <div
          class="shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          style="width: 72px; height: 72px"
          @click="handleContactClick(method)"
        >
          <NuxtImg
            :src="method.icon"
            :alt="method.name"
            width="60"
            height="60"
            loading="lazy"
            class="mt-6 lg:mt-4 object-contain"
          />
        </div>

        <!-- Right side - Label and Contact Button -->
        <div class="flex flex-col gap-2 flex-1">
          <!-- Platform Name -->
          <span class="text-[#8F8F8F] text-lg font-normal">
            {{ method.name }}
          </span>

          <!-- Contact Button -->
          <button
            class="font-normal w-full bg-[#1b1b1b] border border-[#929292] text-white px-10 py-3 rounded-full text-[16px] text-left cursor-default"
          >
            {{ method.contact }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { cdn } from "@/utils/assetUrl";

const siteConfig = useSiteConfig();

// userPageConfig is populated from the /site/config/userpage API in app.vue
const { config: apiConfig } = useSiteConfigState();
const contact = computed(
  () => apiConfig.value?.contact?.handles || siteConfig.contact.handles,
);

interface ContactMethod {
  id: string;
  name: string;
  icon: string;
  contact: string;
  type: "phone" | "username";
}

const contactMethods = computed<ContactMethod[]>(() => [
  {
    id: "whatsapp",
    name: "Whatsapp",
    icon: cdn("/designs/social-icons/contact-whatsapp.webp"),
    contact: contact.value.whatsapp || "",
    type: "phone",
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: cdn("/designs/social-icons/contact-telegram.webp"),
    contact: contact.value.telegram || "",
    type: "username",
  },
  {
    id: "line",
    name: "LINE",
    icon: cdn("/designs/social-icons/contact-line.webp"),
    contact: contact.value.line || "",
    type: "username",
  },
  {
    id: "messenger",
    name: "Messenger",
    icon: cdn("/designs/social-icons/contact-messenger.webp"),
    contact: contact.value.messenger || "",
    type: "username",
  },
]);

const handleContactClick = (method: ContactMethod) => {
  let url = "";

  switch (method.id) {
    case "whatsapp": {
      const phoneNumber = method.contact.replace(/[+\s]/g, "");
      url = `https://wa.me/${phoneNumber}`;
      break;
    }
    case "telegram": {
      const telegramUsername = method.contact.replace("@", "");
      url = `https://t.me/${telegramUsername}`;
      break;
    }
    case "line": {
      const lineUsername = method.contact.startsWith("@")
        ? method.contact
        : `@${method.contact}`;
      url = `https://line.me/R/ti/p/${lineUsername}`;
      break;
    }
    case "messenger": {
      const messengerUsername = method.contact.replace("@", "");
      url = `https://m.me/${messengerUsername}`;
      break;
    }
    default:
      return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};
</script>
