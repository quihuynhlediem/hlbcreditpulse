import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openAs } from "./helpers";

/** Quality pass for Step 21: no serious or critical accessibility violations on the demo screens. */
const SCREENS: [string, string, string][] = [
  ["launcher", "/", "cus_mai"],
  ["Shopee checkout (SCR-10)", "/shopee/checkout", "cus_mai"],
  ["VM home (SCR-11)", "/viettel-money", "cus_khoa"],
  ["limit hub (SCR-26)", "/viettel-money/limit?from=hub", "cus_mai"],
  ["loans (SCR-29)", "/viettel-money/loans", "cus_khoa"],
  ["privacy (SCR-20)", "/viettel-money/privacy", "cus_khoa"],
  ["Grab home (SCR-40)", "/grab", "cus_hung"],
  ["Grab offers (SCR-42)", "/grab/limit?from=hub", "cus_hung"],
  ["Grab loans (SCR-29)", "/grab/loans", "cus_hung_loan"],
  ["SBH home (SCR-50)", "/so-ban-hang", "cus_phung"],
  ["SBH limit hub (SCR-26)", "/so-ban-hang/limit?from=hub", "cus_phung"],
  ["SBH loans (SCR-29)", "/so-ban-hang/loans", "cus_phung_loan"],
  ["console log (SCR-60)", "/creditpulse/decisions", "cus_mai"],
  ["console ranking (SCR-62)", "/creditpulse/ranking", "cus_mai"],
  ["console guardrails (SCR-66)", "/creditpulse/guardrails", "cus_mai"],
  ["console appeals (SCR-63)", "/creditpulse/appeals", "cus_mai"],
];

for (const [name, path, persona] of SCREENS) {
  test(`a11y: ${name} has no serious or critical violations`, async ({ page }) => {
    await openAs(page, "A", "A2", persona);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    const r = await new AxeBuilder({ page }).exclude("nextjs-portal").withTags(["wcag2a", "wcag2aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}

test("keyboard: the launcher entries and the offer packages are reachable and operable without a mouse", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("entry-A1").focus();
  await expect(page.getByTestId("entry-A1")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/shopee\/checkout/);
  await page.getByTestId("method-vm").focus();
  await page.keyboard.press("Space");
  await page.getByTestId("place-order").focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
  await expect(page.getByTestId("offers")).toBeVisible();
});
