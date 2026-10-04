import { expect, test } from "./fixtures";

test.describe("EP-9 Operator console", () => {
  test("AC-30.1 the log shows masked refs, partner, product, amount, tier, outcome, latency, with filters", async ({ page }) => {
    await page.goto("/creditpulse/decisions");
    const rows = page.getByTestId("decision-row");
    await expect(rows.first()).toBeVisible();
    await expect(rows.first()).toContainText("cus_…");
    const all = await rows.count();
    await page.getByLabel("Đối tác").selectOption("grab");
    await expect.poll(() => rows.count()).toBeLessThan(all);
    for (const t of await rows.allTextContents()) expect(t).toContain("Grab");
  });

  test("AC-30.2 / AC-13.2 decision detail shows waterfall, sources with variables, ratings and reasons", async ({ page }) => {
    await page.goto("/creditpulse/decisions");
    await page.getByTestId("decision-row").first().getByRole("link").click();
    await expect(page.getByTestId("decision-detail")).toBeVisible();
    await expect(page.getByTestId("ratings")).toContainText("RG");
    await expect(page.getByTestId("ratings")).toContainText("AF");
    await expect(page.getByTestId("ratings")).toContainText("IN");
    await expect(page.getByTestId("ratings")).toContainText("LM");
    await expect(page.getByTestId("reasons")).toBeVisible();
  });

  test("AC-14.1 changing weights recomputes scores and ranks", async ({ page }) => {
    await page.goto("/creditpulse/ranking");
    const first = page.getByTestId("rank-row").first();
    await expect(first).toContainText("AD-01");
    await expect(first).toContainText("4,10");
    await page.getByLabel("Trọng số Dự báo").fill("50");
    await page.getByLabel("Trọng số Độ phủ").fill("5");
    await expect(page.getByTestId("weight-sum")).toContainText("100%");
    await page.getByRole("button", { name: "Gửi duyệt trọng số" }).click();
    await page.getByTestId("approve-as-checker").click();
    await expect(page.getByTestId("weights-saved")).toBeVisible();
    await expect(page.getByTestId("rank-row").first()).not.toContainText("4,10");
    await page.getByRole("button", { name: "Đặt lại mặc định" }).click();
    await page.getByRole("button", { name: "Gửi duyệt trọng số" }).click();
    await page.getByTestId("approve-as-checker").click();
    await expect(page.getByTestId("rank-row").first()).toContainText("4,10");
  });

  test("AC-60.2 the maker cannot approve their own change; a checker can", async ({ page }) => {
    await page.goto("/creditpulse/ranking");
    await page.getByLabel("Trọng số Dự báo").fill("50");
    await page.getByLabel("Trọng số Độ phủ").fill("5");
    await page.getByRole("button", { name: "Gửi duyệt trọng số" }).click();
    await expect(page.getByTestId("approval-pending")).toContainText("operator.demo@hlb");
    await page.getByTestId("approve-as-maker").click();
    await expect(page.getByTestId("approval-error")).toHaveText("Bạn không thể tự duyệt thay đổi của mình.");
    await expect(page.getByTestId("rank-row").first()).toContainText("4,10");
    await page.getByTestId("approve-as-checker").click();
    await expect(page.getByTestId("weights-saved")).toBeVisible();
  });

  test("AC-14.2 weights that do not sum to 100% are rejected", async ({ page }) => {
    await page.goto("/creditpulse/ranking");
    await page.getByLabel("Trọng số Dự báo").fill("40");
    await page.getByRole("button", { name: "Gửi duyệt trọng số" }).click();
    await expect(page.getByTestId("weights-error")).toHaveText("Tổng trọng số phải bằng 100%");
  });

  test("AC-13.3 the segment × rung matrix matches the persona design", async ({ page }) => {
    await page.goto("/creditpulse/ranking");
    await expect(page.getByTestId("segment-matrix")).toContainText("SEG-3");
    await expect(page.getByTestId("segment-matrix")).toContainText("AD-07");
    await expect(page.getByTestId("segment-matrix")).toContainText("AD-08");
  });

  test("AC-13.4 excluded sources never appear in the ranking", async ({ page }) => {
    await page.goto("/creditpulse/ranking");
    await expect(page.getByTestId("ranking-table")).toBeVisible();
    for (const banned of [/danh bạ/i, /vị trí/i, /mạng xã hội/i, /social/i]) await expect(page.getByTestId("ranking-table")).not.toContainText(banned);
  });

  test("AC-18.1 / AC-18.4 a reviewer overturns an appeal within authority; the AI decision is kept and the outcome is on the appeal", async ({ page }) => {
    await page.goto("/creditpulse/appeals");
    const lan = page.locator('[data-testid="appeal"]', { hasText: "cus_…lan" });
    await expect(lan).toContainText("Tháng trước tôi nghỉ ốm");
    await lan.getByLabel("Mã lý do").selectOption("NEW_EVIDENCE");
    await lan.getByLabel("Số tiền duyệt lại").fill("10000000");
    await lan.getByTestId("appeal-overturn").click();
    const closed = page.getByTestId("appeals-closed").locator('[data-testid="appeal"]', { hasText: "cus_…lan" });
    await expect(closed).toContainText("Đã duyệt lại");
    await expect(closed).toContainText("10.000.000 ₫");
    await closed.getByRole("link").click();
    await expect(page.getByTestId("decision-detail")).toContainText("Chưa được duyệt");
    await expect(page.getByTestId("decision-detail")).toContainText("Đã duyệt lại");
  });

  test("AC-18.3 / AC-60.2 an overturn above the reviewer's authority waits for a second approver", async ({ page }) => {
    await page.goto("/creditpulse/appeals");
    const binh = page.locator('[data-testid="appeal"]', { hasText: "cus_…binh" });
    await binh.getByLabel("Số tiền duyệt lại").fill("45000000");
    await expect(binh).toContainText("cần người duyệt thứ hai");
    await binh.getByTestId("appeal-overturn").click();
    await expect(binh.getByTestId("approval-pending")).toBeVisible();
    await binh.getByTestId("approve-as-maker").click();
    await expect(binh.getByTestId("approval-error")).toHaveText("Bạn không thể tự duyệt thay đổi của mình.");
    await binh.getByTestId("approve-as-checker").click();
    await expect(page.getByTestId("appeals-closed")).toContainText("cus_…binh");
  });

  test("AC-31.2 learning loop shows test band, champion vs challenger, wrongful declines and documentation", async ({ page }) => {
    await page.goto("/creditpulse/learning");
    await expect(page.getByTestId("learning")).toContainText("3%");
    await expect(page.getByTestId("champion")).toContainText("Tỷ lệ duyệt");
    await expect(page.getByTestId("challenger")).toContainText("Tỷ lệ nợ xấu");
    await expect(page.getByTestId("learning")).toContainText("Từ chối nhầm ước tính");
    await expect(page.getByRole("link", { name: "Xem tài liệu" })).toBeVisible();
  });

  test("AC-31.3 pausing the test band (approved by a checker) shows the not-enough-data state", async ({ page }) => {
    await page.goto("/creditpulse/learning");
    await page.getByTestId("pause-band").click();
    await page.getByTestId("approve-as-checker").click();
    await expect(page.getByTestId("insufficient")).toContainText("Chưa đủ dữ liệu để so sánh mô hình.");
  });

  test("AC-32.1 the consent ledger lists purpose, source, time and withdrawals with export", async ({ page }) => {
    await page.goto("/creditpulse/consent");
    await expect(page.getByTestId("ledger-row").first()).toBeVisible();
    await expect(page.getByTestId("ledger")).toContainText("Mục đích");
    await expect(page.getByRole("button", { name: "Xuất CSV" })).toBeVisible();
  });

  test("AC-32.2 the TIA register shows the filed status", async ({ page }) => {
    await page.goto("/creditpulse/consent");
    await expect(page.getByTestId("tia")).toContainText("Đã nộp hồ sơ");
  });

  test("AC-63.4 / AC-61.1 an approved guardrail change applies to the next decision and is logged with maker and checker", async ({ page }) => {
    await page.goto("/creditpulse/guardrails");
    await page.getByLabel("Số khoản mở tối đa").fill("4");
    await page.getByRole("button", { name: "Gửi duyệt chính sách" }).click();
    await page.getByTestId("approve-as-checker").click();
    await expect(page.getByTestId("policy-msg")).toContainText("áp dụng cho quyết định tiếp theo");
    await expect(page.getByTestId("audit-row").first()).toContainText("operator.demo@hlb");
    await expect(page.getByTestId("audit-row").first()).toContainText("policy.update");
    await expect(page.getByTestId("audit-row").first()).toContainText("duyệt bởi checker.demo@hlb");
  });

  test("AC-63.3 an out-of-range DTI cap is refused", async ({ page }) => {
    await page.goto("/creditpulse/guardrails");
    await page.getByLabel("Trần DTI").fill("90");
    await page.getByRole("button", { name: "Gửi duyệt chính sách" }).click();
    await expect(page.getByTestId("policy-msg")).toContainText("Trần DTI phải trong khoảng 0–60%");
  });

  test("AC-33.5 / AC-33.3 partners list products and a test webhook appears in the log with a status", async ({ page }) => {
    await page.goto("/creditpulse/partners");
    await expect(page.getByTestId("partner-row")).toHaveCount(3);
    await page.getByTestId("test-webhook-grab").click();
    await expect(page.getByTestId("webhook-row").first()).toContainText("test.ping", { timeout: 10_000 });
  });
});
