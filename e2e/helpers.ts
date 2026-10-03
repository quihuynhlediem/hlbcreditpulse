import { expect, type Page } from "@playwright/test";

export async function openEntry(page: Page, id: string, query = "") {
  await page.goto("/" + query);
  await page.getByTestId(`entry-${id}`).click();
}

/** A1: Shopee checkout -> choose Viettel Money installments -> wait for offers. */
export async function toOffers(page: Page, opts: { entry?: string } = {}) {
  await openEntry(page, opts.entry ?? "A1");
  await page.getByTestId("method-vm").click();
  await page.getByTestId("place-order").click();
  await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
  await expect(page.getByTestId("offers")).toBeVisible();
}

export async function connectNext(page: Page) {
  const sug = page.getByTestId("next-suggestion");
  const before = await sug.textContent();
  await sug.getByRole("button").click();
  await page.getByRole("button", { name: "Đồng ý kết nối" }).click();
  await expect(page.getByTestId("consent-sheet")).toBeHidden();
  // wait for the suggestion to move on to the next source (or disappear)
  await expect.poll(async () => (await sug.count()) === 0 || (await sug.textContent()) !== before).toBe(true);
}

/** The app's own alert, not Next's route announcer. */
export const appAlert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

export async function setScenario(page: Page, label: string) {
  await page.getByLabel("Kịch bản").selectOption({ label });
}

export async function setPersona(page: Page, label: string) {
  await page.getByLabel("Nhân vật").selectOption({ label });
}

/** Opens an entry directly with a persona override (the deep link used by the demo frame). */
export async function openAs(page: Page, flow: string, entry: string, persona: string, query = "") {
  await page.goto(`/demo/${flow}/${entry}?persona=${persona}${query}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/demo/")); // the persona is stored before the partner screen opens
}
