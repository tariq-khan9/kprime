import en from "./json/en.json" with { type: "json" }

/**
 * Deep-merged over the dashboard's own strings, so a key here replaces
 * Medusa's copy — that is how the login page stops saying "Welcome to Medusa".
 */
export default {
  en: {
    translation: en,
  },
}
