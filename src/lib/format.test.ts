import { afterEach, describe, expect, it } from "vitest";
import { setLocaleNow, tr } from "@/i18n";
import { eirText, vnd } from "./format";

describe("format", () => {
  afterEach(() => setLocaleNow("en"));
  it("formats VND with comma separators in English (default)", () => {
    expect(vnd(12000000)).toBe("12,000,000 ₫");
    expect(eirText(0.125)).toBe("12.5% p.a.");
  });
  it("formats VND with dot separators and a decimal comma in Vietnamese", () => {
    setLocaleNow("vi");
    expect(vnd(12000000)).toBe("12.000.000 ₫");
    expect(eirText(0.125)).toBe("12,5%/năm");
    expect(eirText(0)).toBe("0%");
  });
});

describe("i18n", () => {
  it("translates exact copy and templates from the Vietnamese source", () => {
    expect(tr("Đặt hàng", "en")).toBe("Place order");
    expect(tr("Bạn đang có 3 khoản trả góp. Hoàn tất một khoản để vay thêm.", "en")).toBe("You already have 3 instalment loans. Finish one to borrow more.");
    expect(tr("Đặt hàng", "vi")).toBe("Đặt hàng");
  });
});
