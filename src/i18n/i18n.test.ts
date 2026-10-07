import { afterEach, describe, expect, it } from "vitest";
import en from "./locales/en.json";
import vi from "./locales/vi.json";
import { getLocale, i18n, setLocaleNow, t, tKey, tr, trDeep } from "./index";

const EN = en as Record<string, string>;
const VI = vi as Record<string, string>;
const base = (k: string) => k.replace(/_(one|other)$/, "");

describe("i18n", () => {
  afterEach(() => setLocaleNow("en"));

  it("defaults to English and switches to Vietnamese", () => {
    expect(getLocale()).toBe("en");
    expect(t("Đặt hàng")).toBe("Place order");
    setLocaleNow("vi");
    expect(t("Đặt hàng")).toBe("Đặt hàng");
  });

  it("fills positional placeholders in both languages", () => {
    expect(t("Còn {0} giờ", 3)).toBe("3 h left");
    setLocaleNow("vi");
    expect(t("Còn {0} giờ", 3)).toBe("Còn 3 giờ");
  });

  it("supports named placeholders and English plural forms", () => {
    i18n.addResources("en", "translation", { "Còn {count} ngày_one": "{count} day left", "Còn {count} ngày_other": "{count} days left" });
    expect(t("Còn {count} ngày", { count: 1 })).toBe("1 day left");
    expect(t("Còn {count} ngày", { count: 4 })).toBe("4 days left");
    setLocaleNow("vi");
    expect(t("Còn {count} ngày", { count: 4 })).toBe("Còn 4 ngày");
  });

  it("falls back to the Vietnamese text when there is no English entry", () => {
    expect(t("Chuỗi chưa có bản dịch")).toBe("Chuỗi chưa có bản dịch");
  });

  it("tKey returns the Vietnamese source text whatever the language", () => {
    expect(tKey("Được duyệt")).toBe("Được duyệt");
    expect(tKey("{0} tháng", 6)).toBe("6 tháng");
    expect(t(tKey("{0} tháng", 6))).toBe("6 months");
  });

  it("translates composed mock text by pattern and keeps acronyms when lower-casing", () => {
    expect(tr("Ví của bạn có thu nhập đều đặn 12 tháng; hồ sơ CIC không có nợ xấu.", "en")).toBe("Your wallet shows regular income for 12 months; CIC file shows no bad debt.");
    expect(trDeep({ outcome: "DECLINED", title: "Không tìm thấy khoản vay" }, "en")).toEqual({ outcome: "DECLINED", title: tr("Không tìm thấy khoản vay", "en") });
  });

  it("has an English entry for every Vietnamese key", () => {
    const enBases = new Set(Object.keys(EN).map(base));
    expect(Object.keys(VI).filter((k) => !enBases.has(base(k)))).toEqual([]);
  });

  it("does not leave Vietnamese copy in the English catalogue", () => {
    // Names of people, partners and places stay as they are; "{0}." templates are the same in both languages.
    const same = new Set(["{0}; {1}.", "{0}.", "A4 TikTok Shop / Lazada", "Khoa · SEG-1", "Mai · SEG-2", "Đỗ Thu An", "Hùng", "Hùng · SEG-3", "Lê Văn Tùng", "Nguyễn Thị Mai", "Phạm Văn Hùng", "Phụng", "Phụng · SEG-4", "Sổ Bán Hàng", "Trần Minh Khoa", "Tùng", "Tùng · SEG-5", "Võ Thị Phụng"]);
    expect(Object.entries(EN).filter(([k, v]) => !same.has(base(k)) && (!v || v === base(k))).map(([k]) => k)).toEqual([]);
  });

  it("uses the same placeholders in every English entry as in its Vietnamese key", () => {
    const names = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(",");
    expect(Object.entries(EN).filter(([k, v]) => names(base(k)) !== names(v)).map(([k]) => k)).toEqual([]);
  });
});
