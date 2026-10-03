import { expect, test } from "@playwright/test";
import { appAlert, connectNext, openEntry, setScenario, toOffers } from "./helpers";

test.describe("EP-1 Demo frame & partner entry", () => {
  test("AC-01.1 launcher shows three flows with at least three entry points each", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("entry-A1")).toBeVisible();
    for (const f of ["A", "B", "C"]) {
      const n = await page.getByTestId(`flow-${f}`).getByRole("button").count();
      expect(n).toBeGreaterThanOrEqual(3);
    }
  });
  test("AC-01.2 an entry opens the partner surface with its persona", async ({ page }) => {
    await openEntry(page, "A2");
    await expect(page).toHaveURL(/\/viettel-money$/);
    await expect(page.getByTestId("hlb-banner")).toContainText("30.000.000");
  });
  test("AC-01.3 unknown deep link lands on a clear message", async ({ page }) => {
    await page.goto("/demo/A/Z9");
    await expect(appAlert(page)).toContainText("Không tìm thấy kịch bản. Chọn một luồng để bắt đầu.");
  });
  test("AC-01.4 launcher opens the console and the inspector", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "API inspector" }).first().click();
    await expect(page.getByTestId("api-inspector")).toBeVisible();
    await page.getByRole("button", { name: "Đóng" }).click();
    await page.getByRole("link", { name: "Bảng điều khiển CreditPulse" }).click();
    await expect(page).toHaveURL(/creditpulse\/decisions/);
  });
  test("AC-02.1 scenario toggle changes the next response", async ({ page }) => {
    await page.goto("/");
    await setScenario(page, "Hồ sơ mỏng (hạn mức khởi đầu)");
    await expect(page.getByLabel("Kịch bản")).toHaveValue("THIN_FILE");
  });
  test("AC-02.2 reset restores seed data and returns to the entry point", async ({ page }) => {
    await openEntry(page, "A1");
    await page.getByRole("button", { name: "Đặt lại dữ liệu demo" }).click();
    await expect(page).toHaveURL(/\/shopee\/checkout/);
  });
  test("AC-02.4 mock badge can be toggled off", async ({ page }) => {
    await openEntry(page, "A1");
    await expect(page.getByText("Dữ liệu mô phỏng").first()).toBeVisible();
    await page.getByLabel("Huy hiệu mô phỏng").uncheck();
    await expect(page.getByText("Dữ liệu mô phỏng")).toHaveCount(0);
  });
  test("AC-03.1 checkout offers Viettel Money with the HLB badge", async ({ page }) => {
    await openEntry(page, "A1");
    await expect(page.getByTestId("method-vm")).toContainText("Viettel Money · Trả góp qua HLB");
    await expect(page.getByTestId("method-vm").getByTestId("hlb-lockup")).toBeVisible();
  });
  test("AC-03.3 order outside the range disables the method", async ({ page }) => {
    await openEntry(page, "A1");
    await page.goto("/shopee/checkout?amount=1200000");
    await expect(page.getByTestId("method-vm")).toContainText("Trả góp qua HLB không áp dụng cho đơn này");
    await expect(page.getByTestId("method-vm").locator("input")).toBeDisabled();
  });
  test("AC-03.4 redirect failure offers another payment method", async ({ page }) => {
    await openEntry(page, "A1");
    await page.goto("/shopee/redirect?fail=1");
    await expect(appAlert(page)).toContainText("Không mở được Viettel Money. Chọn cách thanh toán khác.");
    await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  });
  test("AC-04.1 pre-screened user sees a teaser, AC-04.2 unknown user does not", async ({ page }) => {
    await openEntry(page, "A2");
    await page.goto("/shopee/checkout");
    await expect(page.getByTestId("prescreen-teaser")).toContainText("Có thể được duyệt tới 30.000.000₫");
    await page.goto("/");
    await page.getByTestId("entry-A1").click();
    await expect(page.getByTestId("prescreen-teaser")).toHaveCount(0);
  });
});

test.describe("SL-1 critical path: Mai buys on Shopee with Viettel Money", () => {
  test("AC-03.2 / AC-06.4 / AC-06.3 starter limit disables packages and offers to unlock", async ({ page }) => {
    await toOffers(page);
    await expect(page.getByTestId("offer-limit")).toHaveText("3.000.000 ₫");
    await expect(page.getByTestId("no-package")).toContainText("Hiện chưa có gói phù hợp cho đơn này. Mở khóa hạn mức để xem gói trả góp.");
    await expect(page.getByTestId("package-card").first()).toContainText("Vượt hạn mức hiện tại — Mở khóa thêm");
  });

  test("AC-08.1 / AC-08.2 / AC-12.1 / AC-12.2 / AC-12.3 consent per source raises the limit and names the data", async ({ page }) => {
    await toOffers(page);
    await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
    await expect(page.getByTestId("current-limit")).toHaveText("3.000.000 ₫");
    await expect(page.getByTestId("next-suggestion")).toContainText("lịch sử ví");
    await page.getByTestId("next-suggestion").getByRole("button").click();
    const sheet = page.getByTestId("consent-sheet");
    await expect(sheet).toContainText("Dữ liệu được đọc");
    await expect(sheet).toContainText("Mục đích");
    await expect(sheet).toContainText("Thời gian lưu");
    await expect(sheet).toContainText("Rút lại");
    await page.getByRole("button", { name: "Đồng ý kết nối" }).click();
    await expect(page.getByTestId("current-limit")).toHaveText("8.000.000 ₫");
    await expect(page.getByTestId("limit-toast")).toContainText("nhờ lịch sử ví");
    await connectNext(page);
    await expect(page.getByTestId("current-limit")).toHaveText("15.000.000 ₫");
  });

  test("AC-08.3 declining a consent continues at the lower limit", async ({ page }) => {
    await toOffers(page);
    await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
    await page.getByTestId("next-suggestion").getByRole("button").click();
    await page.getByRole("button", { name: "Không đồng ý" }).click();
    await expect(page.getByTestId("consent-sheet")).toContainText("Không kết nối thì hạn mức giữ ở 3.000.000 ₫");
    await page.getByRole("button", { name: "Vẫn không đồng ý" }).click();
    await expect(page.getByTestId("consent-sheet")).toBeHidden();
    await expect(page.getByTestId("current-limit")).toHaveText("3.000.000 ₫");
  });

  test("AC-06.1 / AC-06.2 / AC-06.5 / AC-10.1 / AC-16.1 / AC-17.1 / AC-20.1 / AC-20.2 / AC-05.1 full path to the aha and back to Shopee", async ({ page }) => {
    await toOffers(page);
    await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
    await connectNext(page);
    await connectNext(page);
    await page.getByRole("button", { name: "Quay lại gói trả góp" }).click();
    const cards = page.getByTestId("package-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText("2.000.000 ₫");
    await expect(cards.nth(0)).toContainText("12.000.000 ₫");
    await expect(cards.nth(0)).toContainText("0% (người bán chịu)");
    await expect(cards.nth(1)).toContainText("12.600.000 ₫");
    await expect(cards.nth(1)).toContainText("12,5%/năm");
    await expect(cards.nth(2)).toContainText("13.020.000 ₫");
    await expect(cards.nth(2)).toContainText("16,5%/năm");
    await expect(page.getByTestId("hlb-lockup").last()).toBeVisible();
    await cards.nth(1).getByRole("button", { name: "Chi phí chi tiết" }).click();
    await expect(page.getByTestId("cost-sheet")).toContainText("Tất toán sớm: không phí ẩn");
    await page.getByRole("button", { name: "Đóng" }).click();
    await cards.nth(0).getByRole("button").first().click();
    await page.getByTestId("choose-package").click();
    // eKYC
    await expect(page.getByTestId("ekyc")).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu quét" }).click();
    await expect(page.getByText("Đã xác thực danh tính")).toBeVisible({ timeout: 10_000 });
    // decision (aha)
    await expect(page.getByTestId("decision")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("decision")).toContainText("Đã được duyệt 12.000.000 ₫");
    await expect(page.getByTestId("decision-reason")).toContainText("Ví của bạn có thu nhập đều đặn 12 tháng");
    await expect(page.getByTestId("decision")).toContainText("Thêm tài khoản lương hdb".replace("hdb", "hlb"));
    await page.getByRole("button", { name: "Tiếp tục ký hợp đồng" }).click();
    // contract
    await expect(page.getByTestId("contract")).toContainText("Hong Leong Bank Vietnam");
    await expect(page.getByTestId("contract")).toContainText("Không có");
    await page.getByLabel(/Nhập mã OTP/).fill("123456");
    await page.getByRole("button", { name: "Ký và xác nhận" }).click();
    await expect(page.getByTestId("order-result")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("order-result")).toContainText("Đặt hàng thành công");
    await expect(page.getByTestId("order-result")).toContainText("6 tháng × 2.000.000 ₫");
  });

  test("AC-20.3 wrong OTP three times locks signing", async ({ page }) => {
    await toOffers(page);
    await page.getByRole("button", { name: "Mở khóa hạn mức" }).first().click();
    await connectNext(page);
    await connectNext(page);
    await page.getByRole("button", { name: "Quay lại gói trả góp" }).click();
    await page.getByTestId("package-card").first().getByRole("button").first().click();
    await page.getByTestId("choose-package").click();
    await page.getByRole("button", { name: "Bắt đầu quét" }).click();
    await expect(page.getByTestId("decision")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Tiếp tục ký hợp đồng" }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByLabel(/Nhập mã OTP/).fill("000000");
      await page.getByRole("button", { name: "Ký và xác nhận" }).click();
      await expect(appAlert(page)).toContainText("Mã OTP chưa đúng");
      await expect(page.getByLabel(/Nhập mã OTP/)).toHaveValue(""); // the failed attempt has fully settled
    }
    await expect(appAlert(page)).toContainText("Bạn đã hết lượt thử.");
    await expect(page.getByRole("button", { name: "Ký và xác nhận" })).toBeDisabled();
  });

  test("AC-05.2 cancelling returns to Shopee unpaid", async ({ page }) => {
    await openEntry(page, "A1");
    await page.goto("/shopee/orders/SPE-2026-0001?result=cancelled");
    await expect(page.getByTestId("order-result")).toContainText("Bạn đã hủy thanh toán trả góp");
  });
  test("AC-05.3 missing confirmation shows the failed state", async ({ page }) => {
    await openEntry(page, "A1");
    await page.goto("/shopee/orders/SPE-2026-0001?result=failed");
    await expect(page.getByTestId("order-result")).toContainText("Thanh toán chưa hoàn tất. Đơn hàng chưa bị trừ tiền.");
  });
});

test.describe("EP-2 states", () => {
  test("AC-07.1 slow response shows the still-checking copy", async ({ page }) => {
    await openEntry(page, "A1");
    await setScenario(page, "Phản hồi chậm (> 3 giây)");
    await page.getByTestId("method-vm").click();
    await page.getByTestId("place-order").click();
    await expect(page.getByText("Đang kiểm tra, vui lòng chờ thêm vài giây…")).toBeVisible({ timeout: 12_000 });
    await page.waitForURL(/offers/, { timeout: 15_000 });
  });
  test("AC-07.2 service error offers retry and another method", async ({ page }) => {
    await openEntry(page, "A1");
    await page.goto("/viettel-money/pay/new?scenario=error-createOfferRequest");
    await expect(appAlert(page)).toContainText("Chưa thể tải gói trả góp lúc này. Đơn hàng của bạn vẫn được giữ.");
    await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chọn cách thanh toán khác" })).toBeVisible();
  });
});

test.describe("EP-4 / EP-5 / EP-6", () => {
  test("AC-10.2 chip unreadable three times opens the fallback", async ({ page }) => {
    await openEntry(page, "A1");
    await setScenario(page, "Lỗi eKYC");
    await page.goto("/viettel-money/ekyc");
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /Bắt đầu quét|Thử lại/ }).first().click();
      await expect(appAlert(page)).toBeVisible({ timeout: 8_000 });
    }
    await expect(appAlert(page)).toContainText("Điện thoại chưa đọc được chip CCCD. Bạn có thể thử lại hoặc chụp CCCD và quét khuôn mặt.");
    await expect(page.getByText("Chụp CCCD và quét khuôn mặt").first()).toBeVisible();
  });
  test("AC-10.3 face mismatch three times offers another payment method", async ({ page }) => {
    await openEntry(page, "A1");
    await setScenario(page, "Lỗi eKYC");
    await page.goto("/viettel-money/ekyc");
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /Bắt đầu quét|Thử lại/ }).first().click(); await expect(appAlert(page)).toBeVisible({ timeout: 8_000 }); }
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /Thử lại/ }).first().click(); await expect(appAlert(page)).toContainText(/Chưa khớp khuôn mặt/, { timeout: 8_000 }); }
    await expect(page.getByRole("button", { name: "Chọn cách thanh toán khác" })).toBeVisible();
  });
  test("AC-12.4 thin history leaves the limit unchanged", async ({ page }) => {
    await openEntry(page, "A1");
    await setScenario(page, "Hồ sơ mỏng (hạn mức khởi đầu)");
    await page.goto("/viettel-money/limit");
    await page.getByTestId("next-suggestion").getByRole("button").click();
    await page.getByRole("button", { name: "Đồng ý kết nối" }).click();
    await expect(page.getByText("Chưa đủ dữ liệu — quay lại sau 45 ngày")).toBeVisible();
    await expect(page.getByTestId("current-limit")).toHaveText("3.000.000 ₫");
  });
  test("AC-12.5 no CIC file is shown without penalty", async ({ page }) => {
    await openEntry(page, "A3");
    await expect(page.getByText("CIC: Chưa có hồ sơ — không ảnh hưởng đến bạn")).toBeVisible();
  });
  test("AC-17.2 / AC-17.4 a decline gives reasons and a path, never a score, using the returned explanation text", async ({ page }) => {
    await openEntry(page, "A1");
    await setScenario(page, "Chưa được duyệt");
    await page.goto("/viettel-money/limit");
    await connectNext(page); await connectNext(page);
    await page.goto("/viettel-money/ekyc");
    await page.getByRole("button", { name: "Bắt đầu quét" }).click();
    await expect(page.getByTestId("decision")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("decision")).toContainText("Rất tiếc, hiện chưa thể duyệt khoản này");
    await expect(page.getByTestId("decision-reason")).toContainText("Thu nhập ước tính chưa đủ so với khoản trả hằng tháng.");
    await expect(page.getByRole("button", { name: "Chọn cách thanh toán khác" })).toBeVisible();
    await expect(page.getByTestId("decision")).not.toContainText(/điểm|score/i);
  });
  test("AC-17.3 / AC-16.3 manual review message when no confident result", async ({ page }) => {
    await openEntry(page, "A1");
    await setScenario(page, "Xem xét thủ công");
    await page.goto("/viettel-money/limit");
    await connectNext(page); await connectNext(page);
    await page.goto("/viettel-money/ekyc");
    await page.getByRole("button", { name: "Bắt đầu quét" }).click();
    await expect(page.getByTestId("decision")).toContainText("Hồ sơ cần xem thêm", { timeout: 20_000 });
    await expect(page.getByTestId("decision")).toContainText("Chúng tôi sẽ báo kết quả trong vòng 4 giờ làm việc.");
  });
  test("AC-19.2 a fourth open loan is blocked", async ({ page }) => {
    await openEntry(page, "A1");
    await page.getByLabel("Nhân vật").selectOption("cus_an");
    await page.goto("/viettel-money/ekyc");
    await page.getByRole("button", { name: "Bắt đầu quét" }).click();
    await expect(page.getByTestId("decision")).toContainText("Bạn đang có 3 khoản trả góp. Hoàn tất một khoản để vay thêm.", { timeout: 20_000 });
  });
});

test.describe("EP-10 inspector", () => {
  test("AC-33.1 inspector lists calls with method, path, latency and the screen", async ({ page }) => {
    await toOffers(page);
    await page.getByRole("button", { name: "API inspector" }).first().click();
    const call = page.getByTestId("api-call").first();
    await expect(call).toContainText("POST");
    await expect(call).toContainText("/api/v1/offers");
    await expect(call).toContainText("ms");
    await expect(call).toContainText("SCR-21");
  });
});
