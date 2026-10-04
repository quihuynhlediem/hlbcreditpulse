import { expect, test, type Page } from "@playwright/test";
import { openEntry } from "./helpers";

/** Text of the product screens without the presenter bar and the API inspector (R-27). */
async function productText(page: Page) {
  return page.evaluate(() => {
    const c = document.body.cloneNode(true) as HTMLElement;
    c.querySelector('[data-testid="demo-chrome"]')?.remove();
    c.querySelector('[aria-label="API inspector"]')?.remove();
    return c.innerText;
  });
}

test.describe("R-26 language: English by default, switchable to Vietnamese", () => {
  test("R-26.1 the app opens in English and the switch turns it into Vietnamese", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("lang-en")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Choose a flow and an entry point.").first()).toBeVisible();
    await openEntry(page, "A1");
    await expect(page.getByTestId("place-order")).toHaveText("Place order");
    await expect(page.getByTestId("method-vm")).toContainText("Viettel Money · Instalments with HLB");
    await page.getByTestId("lang-vi").click();
    await expect(page.getByTestId("place-order")).toHaveText("Đặt hàng");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await page.getByTestId("lang-en").click();
    await expect(page.getByTestId("place-order")).toHaveText("Place order");
  });

  test("R-26.2 content served by the engine is in English too (consent text, limits, decision reasons)", async ({ page }) => {
    await openEntry(page, "A1");
    await page.getByTestId("method-vm").click();
    await page.getByTestId("place-order").click();
    await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
    await expect(page.getByTestId("offer-limit")).toHaveText("3,000,000 ₫");
    await page.getByRole("button", { name: "Unlock limit" }).first().click();
    await page.getByTestId("next-suggestion").getByRole("button").click();
    await expect(page.getByTestId("consent-sheet")).toContainText("Share your wallet transaction history with Hong Leong Bank");
    await page.getByRole("button", { name: "Agree and connect" }).click();
    await expect(page.getByTestId("current-limit")).toHaveText("8,000,000 ₫");
    await expect(page.getByTestId("limit-toast")).toContainText("Limit raised to 8,000,000 ₫ thanks to wallet history");
    await expect(page.getByTestId("next-suggestion")).toContainText("bill payments");
    await page.getByTestId("next-suggestion").getByRole("button").click();
    await page.getByRole("button", { name: "Agree and connect" }).click();
    await expect(page.getByTestId("current-limit")).toHaveText("15,000,000 ₫");
    await page.getByRole("button", { name: "Back to instalment packages" }).click();
    await page.getByTestId("choose-package").click();
    await page.getByRole("button", { name: "Start scan" }).click();
    await expect(page.getByTestId("decision")).toContainText("Approved 12,000,000 ₫", { timeout: 20_000 });
    await expect(page.getByTestId("decision-reason")).toContainText("Your wallet shows regular income for 12 months");
  });
});

test.describe("R-27 product screens carry no demo markers", () => {
  test("R-27.1 partner flows and the console show no simulation buttons or demo labels", async ({ page }) => {
    const marker = /mô phỏng|minh họa|\(demo\)|mock data|simulat/i;
    for (const entry of ["A1", "B2", "C3"]) {
      await openEntry(page, entry);
      await page.waitForTimeout(800);
      expect(await productText(page)).not.toMatch(marker);
    }
    for (const path of ["/creditpulse/decisions", "/creditpulse/appeals", "/creditpulse/guardrails", "/creditpulse/learning", "/creditpulse/consent", "/creditpulse/partners"]) {
      await page.goto(path);
      await page.waitForTimeout(600);
      expect(await productText(page)).not.toMatch(marker);
    }
  });

  test("R-27.2 outside events (marketplace seller's answer) are triggered from the presenter bar, not the product screen", async ({ page }) => {
    await openEntry(page, "A5");
    await page.goto("/shopee/orders/SPE-2026-0001/return");
    await expect(page.getByTestId("demo-chrome").getByTestId("seller-rejects")).toBeVisible();
  });
});
