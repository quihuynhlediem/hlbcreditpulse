import { expect, test, type Page } from "@playwright/test";
import { connectNext, openAs, openEntry, setPersona, setScenario, toOffers } from "./helpers";

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
  test("AC-02.3 blocked storage runs in memory and says so", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    });
    await page.goto("/");
    await expect(page.getByText("Không lưu được dữ liệu trên trình duyệt này")).toBeVisible();
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

  test("AC-19.1 / AC-34.1 a lower DTI cap declines an instalment that no longer fits", async ({ page }) => {
    await page.goto("/creditpulse/guardrails");
    await page.getByLabel("Trần DTI").fill("5");
    await page.getByRole("button", { name: "Lưu chính sách" }).click();
    await expect(page.getByTestId("policy-msg")).toContainText("áp dụng cho quyết định tiếp theo");
    await openAs(page, "A", "A1", "cus_khoa");
    await page.getByTestId("method-vm").click();
    await page.getByTestId("place-order").click();
    await page.waitForURL(/\/viettel-money\/offers\//, { timeout: 20_000 });
    await page.getByTestId("choose-package").click();
    await expect(page.getByTestId("decision")).toHaveAttribute("data-outcome", "DECLINED", { timeout: 20_000 });
    await expect(page.getByTestId("decision-reason")).toContainText("mức trần DTI");
  });

  test("AC-11.2 a device shared by many applicants is flagged and goes to the manual tier", async ({ page }) => {
    await page.goto("/creditpulse/manual");
    await page.getByTestId("manual-case").first().getByRole("link").click();
    await expect(page.getByTestId("device-flag")).toContainText("Thiết bị dùng chung");
    await expect(page.getByTestId("decision-detail")).toContainText("MANUAL");
  });

  test("AC-18.2 an overdue SLA is highlighted", async ({ page }) => {
    await page.goto("/creditpulse/manual");
    const overdue = page.locator('[data-testid="manual-case"][data-overdue="true"]');
    await expect(overdue.first()).toBeVisible();
    await expect(overdue.first()).toContainText("Quá hạn SLA");
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

  test("AC-11.1 / AC-33.2 booking sends the payout to the partner settlement account and webhooks join the timeline", async ({ page }) => {
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
    await openAs(page, "A", "A2", "cus_mai");
    await setPersona(page, "Mai (đang trả góp) · đã có khoản 12 triệu");
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
    await openAs(page, "A", "A2", "cus_mai");
    await setPersona(page, "Mai (đang trả góp) · đã có khoản 12 triệu");
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

  test("AC-29.1 / AC-29.2 graduation offers an HLB card and a seller discount code, never a cash reward", async ({ page }) => {
    await openAs(page, "A", "A2", "cus_khoa");
    await page.goto("/viettel-money/graduation");
    const g = page.getByTestId("graduation");
    await expect(g).toContainText("Thẻ HLB");
    await expect(g).toContainText("Mã giảm giá từ người bán");
    await expect(g).toContainText("Không có thưởng tiền mặt"); // merchant-led referral only (D-11)
  });
});

test.describe("EP-8 Grab and Sổ Bán Hàng servicing", () => {
  test("AC-25.2 two income drops of more than 50% scale deductions down with a reminder", async ({ page }) => {
    await page.goto("/grab/loan/schedule");
    await setPersona(page, "Hùng (đang vay) · khoản 8 triệu");
    await page.getByTestId("simulate-low").click();
    await expect(page.getByTestId("payout-note")).toContainText("Đã khấu trừ");
    await page.getByTestId("simulate-low").click();
    await expect(page.getByTestId("payout-note")).toContainText("giảm mức khấu trừ");
    await expect(page.getByTestId("payout-note")).toContainText("Nhắc nhở");
  });

  test("AC-28.2 day 45 without the minimum shows a warning that a settlement clears", async ({ page }) => {
    await openEntry(page, "C4");
    await expect(page.getByTestId("min-warning")).toContainText("Đã 45 ngày chưa đạt mức tối thiểu");
    await page.getByTestId("simulate").click();
    await expect(page.getByTestId("payout-note")).toBeVisible();
    await expect(page.getByTestId("min-warning")).toBeHidden();
  });
});
