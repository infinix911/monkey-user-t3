// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Vue 3 supports multiple root elements via fragments
    "vue/no-multiple-template-root": "off",
  },
})
