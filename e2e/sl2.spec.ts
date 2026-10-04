import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { connectNext, openAs, openEntry, setScenario, toOffers } from "./helpers";

/** Khoa (pre-approved, eKYC done, data connected): Shopee → offers → first package → decision. */
async function khoaToDecision(page: Page) {
  await openAs(page, "A", "A1", "cus_khoa");
  await page.getByTestId("method-vm").click();
  await page.getByTestId("place-order").click();
  await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
  await expect(page.getByTestId("offers")).toBeVisible();
  await page.getByTestId("choose-package").click();
  await expect(page.getByTestId("decision")).toBeVisible({ timeout: 20_000 });
}

test.describe("EP-2 / EP-3 consent, eKYC and data", () => {
  test("DEMO-02.3 blocked storage runs in memory and says so", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    });
    await page.goto("/");
    // With storage blocked the saved language cannot be read either, so the app falls back to English (R-26).
    await expect(page.getByText("This browser cannot store data")).toBeVisible();
    await expect(page.getByTestId("entry-A1")).toBeVisible();
  });

  test("AC-08.4 a failed consent save says nothing was shared", async ({ page }) => {
    await openEntry(page, "A1", "?scenario=error-createConsent");
    await page.getByTestId("method-vm").click();
    await page.getByTestId("place-order").click();
    await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
    await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
    await page.getByTestId("next-suggestion").getByRole("button").click();
    await page.getByRole("button", { name: "Đồng ý kết nối" }).click();
    await expect(page.getByText("Chưa lưu được lựa chọn. Chưa có dữ liệu nào được chia sẻ.")).toBeVisible();
    await expect(page.getByTestId("current-limit")).toHaveText("3.000.000 ₫");
  });

  test("AC-08.5 the Viettel Money consent sheet offers only Viettel Money's own data", async ({ page }) => {
    await toOffers(page);
    await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
    await page.getByTestId("next-suggestion").getByRole("button").click();
    const sheet = page.getByTestId("consent-sheet");
    await expect(sheet).toContainText("Chỉ dữ liệu từ Viettel Money");
    await expect(sheet).not.toContainText("Grab");
    await expect(sheet).not.toContainText("Sổ Bán Hàng");
  });

  test("AC-09.1 withdrawing a source stops sharing and the receipt shows as withdrawn", async ({ page }) => {
    await openAs(page, "A", "A2", "cus_khoa");
    await page.goto("/viettel-money/privacy");
    await expect(page.getByTestId("consent-row").first()).toBeVisible();
    await page.getByRole("button", { name: "Rút lại" }).first().click();
    await expect(page.getByText("Đã dừng chia sẻ. Dữ liệu sẽ không dùng cho lần xét sau.")).toBeVisible();
    await expect(page.getByText("Đã rút lại").first()).toBeVisible();
  });

  test("AC-10.4 an identity check done once is reused by reference", async ({ page }) => {
    await openAs(page, "A", "A3", "cus_mai");
    await page.goto("/viettel-money/ekyc?next=limit");
    await page.getByRole("button", { name: "Bắt đầu quét" }).click();
    await expect(page.getByText("Đã xác thực danh tính")).toBeVisible({ timeout: 10_000 });
    await page.goto("/viettel-money/decision/new");
    await expect(page.getByTestId("decision")).toBeVisible({ timeout: 20_000 });
    await expect(page).not.toHaveURL(/ekyc/);
  });

  test("AC-19.3 a limit rise queries CIC and stores the result", async ({ page }) => {
    await toOffers(page);
    await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
    await connectNext(page);
    await page.goto("/creditpulse/guardrails");
    await expect(page.getByTestId("audit")).toContainText("cic.refresh");
    await expect(page.getByTestId("audit")).toContainText("hồ sơ CIC đã tra và lưu");
  });
});

test.describe("EP-5 / EP-6 decision and guardrails", () => {
  test("AC-13.1 an approval lists the sources used with their role", async ({ page }) => {
    await khoaToDecision(page);
    await expect(page.getByTestId("decision")).toContainText("Lịch sử ví → Thu nhập đều");
  });

  test("AC-16.4 an unavailable source is skipped and recorded, and the waterfall continues", async ({ page }) => {
    await openAs(page, "A", "A1", "cus_khoa");
    await setScenario(page, "Một nguồn dữ liệu tạm thời không có");
    await page.getByTestId("method-vm").click();
    await page.getByTestId("place-order").click();
    await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
    await page.getByTestId("choose-package").click();
    await expect(page.getByTestId("decision")).toBeVisible({ timeout: 20_000 });
    await page.goto("/creditpulse/decisions");
    await page.getByTestId("decision-row").first().getByRole("link").click();
    await expect(page.getByTestId("waterfall")).toContainText("Không khả dụng");
    await expect(page.getByTestId("waterfall")).toContainText("nguồn tạm thời không có");
    await expect(page.getByTestId("waterfall")).toContainText("Đã truy vấn");
  });

  test("AC-16.2 variable cost per decision is shown and under 30.000 ₫", async ({ page }) => {
    await khoaToDecision(page);
    await page.goto("/creditpulse/decisions");
    await page.getByTestId("decision-row").first().getByRole("link").click();
    await expect(page.getByTestId("cost-per-decision")).toContainText("dưới ngưỡng 30.000 ₫");
  });

  test("AC-19.1 / AC-63.4 / AC-16.7 an approved lower DTI cap turns an instalment that no longer fits into a counter-offer", async ({ page }) => {
    await page.goto("/creditpulse/guardrails");
    await page.getByLabel("Trần DTI").fill("5");
    await page.getByRole("button", { name: "Gửi duyệt chính sách" }).click();
    await page.getByTestId("approve-as-checker").click();
    await expect(page.getByTestId("policy-msg")).toContainText("áp dụng cho quyết định tiếp theo");
    await openAs(page, "A", "A1", "cus_khoa");
    await page.getByTestId("method-vm").click();
    await page.getByTestId("place-order").click();
    await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
    await page.getByTestId("choose-package").click();
    await expect(page.getByTestId("decision")).toHaveAttribute("data-outcome", "COUNTER_OFFER", { timeout: 20_000 });
    await expect(page.getByTestId("decision-reason")).toContainText("vượt khả năng chi trả ước tính");
  });

  test("AC-11.2 a device shared by many applicants is flagged and the engine caps the amount itself", async ({ page }) => {
    await page.goto("/creditpulse/appeals");
    await page.getByTestId("appeal").first().getByRole("link").click();
    await expect(page.getByTestId("device-flag")).toContainText("Thiết bị dùng chung");
    await expect(page.getByTestId("decision-detail")).toContainText("Duyệt số tiền thấp hơn");
    await expect(page.getByTestId("decision-detail")).not.toContainText("MANUAL");
  });

  test("AC-18.2 an appeal past its 2-working-day clock is highlighted", async ({ page }) => {
    await page.goto("/creditpulse/appeals");
    const overdue = page.locator('[data-testid="appeal"][data-sla="RED"]');
    await expect(overdue.first()).toBeVisible();
    await expect(overdue.first()).toContainText("Quá hạn 2 ngày làm việc");
  });

  test("AC-20.4 an expired signing session offers to sign again", async ({ page }) => {
    await khoaToDecision(page);
    await page.getByRole("button", { name: "Tiếp tục ký hợp đồng" }).click();
    await setScenario(page, "Phiên ký hết hạn");
    await page.getByLabel(/Nhập mã OTP/).fill("123456");
    await page.getByRole("button", { name: "Ký và xác nhận" }).click();
    await expect(page.getByTestId("session-expired")).toContainText("Phiên đã hết hạn. Đơn hàng được giữ thêm 15 phút.");
    await page.getByRole("button", { name: "Ký lại hợp đồng" }).click();
    await page.getByLabel(/Nhập mã OTP/).fill("123456");
    await page.getByRole("button", { name: "Ký và xác nhận" }).click();
    await expect(page.getByTestId("order-result")).toContainText("Đặt hàng thành công", { timeout: 15_000 });
  });

  test("AC-11.1 / DEMO-33.2 booking sends the payout to the partner settlement account and webhooks join the timeline", async ({ page }) => {
    await khoaToDecision(page);
    await page.getByRole("button", { name: "Tiếp tục ký hợp đồng" }).click();
    await page.getByLabel(/Nhập mã OTP/).fill("123456");
    await page.getByRole("button", { name: "Ký và xác nhận" }).click();
    await expect(page.getByTestId("order-result")).toBeVisible({ timeout: 15_000 });
    await page.goto("/creditpulse/partners");
    const log = page.getByTestId("webhook-log");
    await expect(log).toContainText("loan.booked");
    await expect(log).toContainText("disbursement.to_partner_settlement_account");
  });
});

test.describe("EP-7 servicing, refunds and behaviour rises", () => {
  test("AC-21.1 / AC-21.2 a loan shows its due date, balance and an exact early-settlement quote", async ({ page }) => {
    await openAs(page, "A", "A2", "cus_khoa");
    await page.goto("/viettel-money/loans");
    await expect(page.getByTestId("next-due")).toContainText("Kỳ tới");
    await expect(page.getByTestId("next-due")).toContainText("Tổng còn phải trả");
    await page.getByRole("button", { name: "Xem báo giá tất toán sớm" }).click();
    await expect(page.getByTestId("settle-quote")).toContainText("Số tiền tất toán");
    await expect(page.getByTestId("settle-quote")).toContainText("không phí ẩn");
  });

  test("AC-21.3 a late instalment says so", async ({ page }) => {
    await openAs(page, "A", "A2", "cus_an");
    await page.goto("/viettel-money/loans");
    await expect(page.getByText("Khoản trả đã quá hạn 1 ngày. Trả ngay để tránh bị tính phí.")).toBeVisible();
  });

  test("AC-22.1 / AC-22.2 a partial return lowers the principal, pauses the due date and sends no adverse CIC", async ({ page }) => {
    await openAs(page, "A", "A5", "cus_mai_loan");
    await page.goto("/shopee/orders/SPE-2026-0001/return");
    await page.getByLabel("Số tiền hoàn").selectOption({ label: "3.000.000 ₫" });
    await page.getByRole("button", { name: "Gửi yêu cầu trả hàng" }).click();
    const status = page.getByTestId("refund-status");
    await expect(status).toContainText("Đã giảm dư nợ 3.000.000 ₫");
    await expect(status).toContainText("Dư nợ mới");
    await expect(status).toContainText("7.000.000 ₫");
    await expect(status).toContainText("Kỳ tạm hoãn đến");
    await expect(status).toContainText("không có thông tin xấu gửi CIC");
  });

  test("AC-22.3 a rejected return keeps the original schedule", async ({ page }) => {
    await openAs(page, "A", "A5", "cus_mai_loan");
    await page.goto("/shopee/orders/SPE-2026-0001/return");
    await page.getByTestId("seller-rejects").click();
    await expect(page.getByTestId("refund-status")).toContainText("Lịch trả được giữ nguyên");
  });

  test("AC-15.1 three on-time instalments raise the limit", async ({ page }) => {
    await openAs(page, "A", "A2", "cus_khoa");
    await page.goto("/viettel-money/graduation");
    await expect(page.getByTestId("graduation")).toContainText("Bạn trả đúng hạn 3 kỳ");
    await expect(page.getByTestId("graduation")).toContainText("Hạn mức mới");
  });

  test("AC-15.2 a late instalment means no rise and no penalty", async ({ page }) => {
    await openAs(page, "A", "A2", "cus_an");
    await page.goto("/viettel-money/graduation");
    await expect(page.getByTestId("graduation")).toContainText("Chưa có ưu đãi mới");
    await expect(page.getByTestId("graduation")).not.toContainText("phí");
  });

  test("AC-29.1 / AC-29.3 graduation offers an HLB card and a seller discount code, never a cash reward", async ({ page }) => {
    await openAs(page, "A", "A2", "cus_khoa");
    await page.goto("/viettel-money/graduation");
    const g = page.getByTestId("graduation");
    await expect(g).toContainText("Thẻ HLB");
    await expect(g).toContainText("Mã giảm giá từ người bán");
    await expect(g).toContainText("Không có thưởng tiền mặt"); // merchant-led referral only (D-11)
  });
});
