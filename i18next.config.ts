import { defineConfig } from "i18next-cli";

/**
 * Copy catalogues for the EN/VI switch (see src/i18n/index.ts). English is the runtime default; Vietnamese is the
 * source language, so its catalogue maps each key to itself and English holds the translations.
 * `tKey()` marks Vietnamese text kept in data constants and mock content.
 *   pnpm i18n:extract   add new keys (vi = the key, en = "" to translate) and drop unused ones
 *   pnpm i18n:check     fail if the catalogues are out of date or an English entry is missing
 */
export default defineConfig({
  locales: ["vi", "en"],
  extract: {
    input: ["src/**/*.{ts,tsx}"],
    ignore: ["src/**/*.test.ts", "src/**/*.d.ts", "src/i18n/index.ts"],
    output: "src/i18n/locales/{{language}}.json",
    primaryLanguage: "vi",
    functions: ["t", "tKey"],
    keySeparator: false,
    nsSeparator: false,
    interpolationPrefix: "{",
    interpolationSuffix: "}",
    defaultValue: (key, _ns, language) => (language === "vi" ? key : ""),
    extractFromComments: false,
    removeUnusedKeys: true,
    sort: true,
    indentation: 2,
  },
});
