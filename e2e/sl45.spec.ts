import { expect, test } from "@playwright/test";
import { openEntry } from "./helpers";

async function throughLoan(page: import("@playwright/test").Page) {
  await page.getByTestId("unlock-source").click();
  await page.getByRole("button", { name: "Đồng ý kết nối" }).click();
  await expect(page.getByTestId("consent-sheet")).toBeHidden();
  await expect(page.getByTestId("package-card").first()).toHaveAttribute("data-available", "true");
  await page.getByTestId("offer-continue").click();
  await expect(page.getByTestId("ekyc")).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu quét" }).click();
  await expect(page.getByTestId("decision")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Tiếp tục ký hợp đồng" }).click();
  await page.getByLabel(/Nhập mã OTP/).fill("123456");
  await page.getByRole("button", { name: "Ký và xác nhận" }).click();
  await expect(page.getByTestId("schedule")).toBeVisible({ timeout: 15_000 });
}

test.describe("EP-7 Grab driver (Flow B)", () => {
  test("AC-23.1 entry B1 opens the offer with slider, deduction per payout, total and EIR", async ({ page }) => {
    await openEntry(page, "B1");
    await expect(page.getByTestId("loan-tile")).toHaveAttribute("data-state", "eligible");
    await expect(page.getByTestId("loan-tile")).toContainText("tới 20.000.000 ₫");
    await page.getByTestId("loan-tile").click();
    await expect(page.getByRole("slider", { name: "Số tiền bạn cần" })).toBeVisible();
    const card = page.getByTestId("package-card").first();
    await expect(card).toContainText("mỗi kỳ nhận tiền");
    await expect(card).toContainText("Tổng số tiền phải trả");
    await expect(card).toContainText("Lãi suất hiệu dụng (EIR)");
    await expect(page.getByTestId("hlb-lockup").last()).toBeVisible();
  });
  test("AC-23.1 entries B2 and B3 reach the same offer or loan", async ({ page }) => {
    await openEntry(page, "B2");
    await expect(page.getByTestId("loan-tile")).toContainText("Thu nhập 3 tháng ổn định");
    await page.getByTestId("loan-tile").click();
    await expect(page).toHaveURL(/\/grab\/loan\/offer/);
  });
  test("AC-23.2 a driver under three months sees the locked tile", async ({ page }) => {
    await openEntry(page, "B4");
    await expect(page.getByTestId("loan-tile")).toHaveAttribute("data-state", "locked");
    await expect(page.getByTestId("loan-tile")).toContainText("Hoạt động thêm 45 ngày để mở khóa");
  });
  test("AC-24.1 the consent sheet asks only for Grab's own platform income", async ({ page }) => {
    await openEntry(page, "B1");
    await page.getByTestId("loan-tile").click();
    await page.getByTestId("unlock-source").click();
    const sheet = page.getByTestId("consent-sheet");
    await expect(sheet).toContainText("thu nhập của bạn trên ứng dụng Grab");
    await expect(sheet).toContainText("không dùng dữ liệu của GrabFin hay công ty liên kết");
    await expect(sheet).not.toContainText("Viettel");
  });
  test("AC-24.2 / AC-27.2 approval, signing and the schedule opens", async ({ page }) => {
    await openEntry(page, "B1");
    await page.getByTestId("loan-tile").click();
    await throughLoan(page);
    await expect(page.getByTestId("signed-note")).toContainText("tài khoản của bạn");
    await expect(page.getByTestId("schedule-list")).toContainText("Kỳ 1");
  });
  test("AC-25.1 a week with no income shows zero deduction", async ({ page }) => {
    await page.goto("/grab/loan/schedule");
    await page.getByLabel("Nhân vật").selectOption({ label: "Hùng (đang vay) · khoản 8 triệu" });
    await expect(page.getByTestId("current-cycle")).toContainText("0 ₫");
    await expect(page.getByTestId("current-cycle")).toContainText("tuần không có thu nhập");
    await expect(page.getByTestId("holiday-card")).toBeVisible();
  });
  test("AC-25.1 the payout push deducts from earnings and updates the balance", async ({ page }) => {
    await openEntry(page, "B3");
    await page.getByTestId("simulate").click();
    await expect(page.getByTestId("payout-note")).toContainText("Đã khấu trừ theo thu nhập tuần");
  });
});

test.describe("EP-8 Sổ Bán Hàng seller (Flow C)", () => {
  test("AC-26.1 entry C1 shows amount, repayment share, 60-day minimum, total and EIR", async ({ page }) => {
    await openEntry(page, "C1");
    await expect(page.getByTestId("loan-tile")).toContainText("Vốn kinh doanh · tới 50.000.000 ₫");
    await page.getByTestId("loan-tile").click();
    await expect(page.getByTestId("lender-offer")).toContainText("tối thiểu mỗi 60 ngày");
    const card = page.getByTestId("package-card").first();
    await expect(card).toContainText("10% mỗi kỳ tiền hàng về");
    await expect(card).toContainText("Tổng số tiền phải trả");
    await expect(card).toContainText("EIR");
  });
  test("AC-26.1 entry C2 banner opens the funding offer", async ({ page }) => {
    await openEntry(page, "C2");
    await expect(page.getByTestId("loan-tile")).toContainText("bạn có thể vay tới 50.000.000 ₫");
    await page.getByTestId("loan-tile").click();
    await expect(page).toHaveURL(/\/so-ban-hang\/loan\/offer/);
  });
  test("AC-26.2 entry C3 restock order pays the supplier", async ({ page }) => {
    await openEntry(page, "C3");
    await expect(page.getByTestId("installment-chip")).toContainText("Trả góp tiền nhập hàng");
    await page.getByTestId("choose-installment").click();
    await expect(page.getByTestId("amount")).toHaveText("18.500.000 ₫");
    await throughLoan(page);
    await expect(page.getByTestId("signed-note")).toContainText("nhà cung cấp");
  });
  test("AC-27.1 the consent sheet asks only for Sổ Bán Hàng's own data", async ({ page }) => {
    await openEntry(page, "C1");
    await page.getByTestId("loan-tile").click();
    await page.getByTestId("unlock-source").click();
    const sheet = page.getByTestId("consent-sheet");
    await expect(sheet).toContainText("doanh thu và thanh toán của cửa hàng");
    await expect(sheet).toContainText("Chỉ dữ liệu từ Sổ Bán Hàng");
  });
  test("AC-28.1 settlements deduct the share and the tracker updates", async ({ page }) => {
    await openEntry(page, "C4");
    const before = await page.getByTestId("remaining").textContent();
    await expect(page.getByTestId("min-countdown")).toContainText("ngày đến kỳ tối thiểu");
    await page.getByTestId("simulate").click();
    await expect(page.getByTestId("payout-note")).toContainText("Đã trả 10% từ tiền hàng về");
    await expect.poll(async () => page.getByTestId("remaining").textContent()).not.toBe(before);
  });
});
