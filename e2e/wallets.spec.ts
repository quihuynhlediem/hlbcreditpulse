import { expect, test } from "./fixtures";
import { connectNext, openEntry, toOffers } from "./helpers";

/** R-28 / D-81: Viettel Money, Grab and Sổ Bán Hàng are e-wallets with the same point-of-purchase lending. */
const WALLETS = [
  { flow: "A", id: "viettel-money", name: "Viettel Money", base: "/viettel-money", persona: "cus_khoa", loanEntry: "A5", others: ["Grab", "Sổ Bán Hàng"] },
  { flow: "B", id: "grab", name: "Grab", base: "/grab", persona: "cus_hung", loanEntry: "B5", others: ["Viettel Money", "Sổ Bán Hàng"] },
  { flow: "C", id: "so-ban-hang", name: "Sổ Bán Hàng", base: "/so-ban-hang", persona: "cus_phung", loanEntry: "C5", others: ["Viettel Money", "Grab"] },
] as const;

for (const w of WALLETS) {
  test.describe(`R-28 ${w.name}: Shopee → ${w.name} → CreditPulse`, () => {
    test(`the first page is the Shopee checkout; ${w.name} is the default method and the only wallet listed`, async ({ page }) => {
      await openEntry(page, `${w.flow}1`);
      await expect(page).toHaveURL(/\/shopee\/checkout/);
      const method = page.getByTestId("method-vm");
      await expect(method).toContainText(`${w.name} · Trả góp qua HLB`);
      await expect(method.locator("input")).toBeChecked();
      for (const o of w.others) await expect(page.locator("main, body").first()).not.toContainText(`${o} · Trả góp qua HLB`);
    });

    test(`placing the order hands over to ${w.name}, then CreditPulse offers`, async ({ page }) => {
      await openEntry(page, `${w.flow}1`);
      await page.getByTestId("place-order").click();
      await expect(page).toHaveURL(/\/shopee\/redirect/);
      await expect(page.getByRole("status")).toContainText(`Đang chuyển sang ${w.name}`);
      await page.waitForURL(new RegExp(`${w.base}/pay/`), { timeout: 20_000 });
      await page.waitForURL(new RegExp(`${w.base}/offers/`), { timeout: 20_000 });
      await expect(page.getByTestId("offers")).toBeVisible();
    });

    test(`the wallet home shows the pre-approved banner and it leads back to the Shopee checkout`, async ({ page }) => {
      await openEntry(page, `${w.flow}2`);
      await expect(page).toHaveURL(new RegExp(`${w.base}$`));
      await expect(page.getByTestId("hlb-banner")).toContainText("hạn mức trả góp HLB tới");
      await page.getByTestId("hlb-banner").getByRole("button").click();
      await expect(page).toHaveURL(/\/shopee\/checkout/);
    });

    test(`the limit hub is reachable from the wallet`, async ({ page }) => {
      await openEntry(page, `${w.flow}3`);
      await expect(page).toHaveURL(new RegExp(`${w.base}/limit`));
      await expect(page.getByTestId("next-suggestion").or(page.getByTestId("ladder")).first()).toBeVisible();
    });

    test(`after purchase the loans screen shows the schedule and auto-debit`, async ({ page }) => {
      await openEntry(page, w.loanEntry);
      await expect(page).toHaveURL(new RegExp(`${w.base}/loans`));
      await expect(page.getByTestId("next-due")).toBeVisible();
    });
  });
}

/** From the offers screen, open the limit hub through "Mở khóa hạn mức" (the identity check is not needed there). */
async function unlockFromOffers(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
}

test.describe("R-28 one product for every wallet", () => {
  test("Grab driver completes the purchase: Shopee → Grab → offers → eKYC → decision → contract → order", async ({ page }) => {
    await toOffers(page, { entry: "B1" });
    await expect(page).toHaveURL(/\/grab\/offers\//);
    await unlockFromOffers(page);
    await connectNext(page); // wallet history
    await connectNext(page); // earnings on Grab
    await page.getByRole("button", { name: "Quay lại gói trả góp" }).click();
    await expect(page.getByTestId("package-card").first()).toHaveAttribute("data-available", "true");
    await page.getByTestId("choose-package").click();
    await expect(page.getByTestId("ekyc")).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu quét" }).click();
    await expect(page.getByTestId("decision")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Tiếp tục ký hợp đồng" }).click();
    await page.getByLabel(/Nhập mã OTP/).fill("123456");
    await page.getByRole("button", { name: "Ký và xác nhận" }).click();
    await expect(page).toHaveURL(/\/shopee\/orders\/.*result=paid/, { timeout: 20_000 });
    await expect(page.getByTestId("order-result")).toContainText("Grab");
  });

  for (const [entry, who, ladderSource] of [["B4", "driver's earnings", "Grab"], ["C4", "shop's sales", "Sổ Bán Hàng"]] as const) {
    test(`${entry}: a new ${who} are not yet sufficient and the ladder says when to come back`, async ({ page }) => {
      await openEntry(page, entry); // opens the new customer's limit hub; the purchase then starts on Shopee
      await page.goto("/shopee/checkout");
      await page.getByTestId("place-order").click();
      await page.waitForURL(/\/offers\//, { timeout: 20_000 });
      await unlockFromOffers(page);
      await connectNext(page);
      await connectNext(page);
      await expect(page.getByTestId("ladder")).toContainText("Chưa đủ dữ liệu — quay lại sau 45 ngày");
      expect(ladderSource.length).toBeGreaterThan(0);
    });
  }

  for (const [entry, own, other] of [["B1", "thu nhập của bạn trên ứng dụng Grab", "không dùng dữ liệu của GrabFin hay công ty liên kết"], ["C1", "doanh thu và thanh toán của cửa hàng", "Chỉ dữ liệu từ Sổ Bán Hàng"]] as const) {
    test(`${entry}: the consent sheet for the wallet's own source names only its own data`, async ({ page }) => {
      await toOffers(page, { entry });
      await unlockFromOffers(page);
      await connectNext(page); // wallet history first, then the wallet's own earnings or sales
      await page.getByTestId("next-suggestion").getByRole("button").click();
      const sheet = page.getByTestId("consent-sheet");
      await expect(sheet).toContainText(own);
      await expect(sheet).toContainText(other);
      await expect(sheet).not.toContainText("Viettel");
    });
  }
});
