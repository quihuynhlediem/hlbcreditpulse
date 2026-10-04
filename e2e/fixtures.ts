import { test as base, expect } from "@playwright/test";

/**
 * Most specs assert the Vietnamese copy from Step 09, so they run with the VI locale.
 * The default (English) is covered by en.spec.ts and a11y.spec.ts.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem("hlb-lang", JSON.stringify({ state: { locale: "vi" }, version: 0 })); } catch { /* storage blocked */ }
    });
    await provide(page);
  },
});
export { expect };
