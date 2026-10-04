/** Scenario entry points (R-20): at least 3 per flow, each fitting a target audience (Step 09 §1.2). The entry sets the persona. */
export interface Entry {
  id: string;
  flow: "A" | "B" | "C";
  title: string;
  audience: string;
  persona: string;
  path: string;
  orderAmount?: number;
  v1?: boolean;
}

export const FLOWS = {
  A: "Luồng A — Viettel Money (khách cá nhân): Shopee → Viettel Money → CreditPulse",
  B: "Luồng B — Grab (tài xế): Shopee → Grab → CreditPulse",
  C: "Luồng C — Sổ Bán Hàng (chủ cửa hàng): Shopee → Sổ Bán Hàng → CreditPulse",
} as const;

export const ENTRIES: Entry[] = [
  { id: "A1", flow: "A", title: "A1 Thanh toán Shopee", audience: "Mai · SEG-2", persona: "cus_mai", path: "/shopee/checkout", orderAmount: 12_000_000 },
  { id: "A2", flow: "A", title: "A2 Banner đã duyệt sẵn", audience: "Khoa · SEG-1", persona: "cus_khoa", path: "/viettel-money", orderAmount: 8_500_000 },
  { id: "A3", flow: "A", title: "A3 Hạn mức trả góp", audience: "Tùng · SEG-5", persona: "cus_tung", path: "/viettel-money/limit?from=hub", orderAmount: 5_000_000 },
  { id: "A4", flow: "A", title: "A4 TikTok Shop / Lazada", audience: "Khách lương", persona: "cus_mai", path: "/shopee/checkout?skin=tiktok", orderAmount: 12_000_000, v1: true },
  { id: "A5", flow: "A", title: "A5 Sau khi mua: khoản trả góp và trả hàng", audience: "Mai (đang trả góp)", persona: "cus_mai_loan", path: "/viettel-money/loans" },
  { id: "B1", flow: "B", title: "B1 Thanh toán Shopee", audience: "Hùng · SEG-3", persona: "cus_hung", path: "/shopee/checkout", orderAmount: 9_000_000 },
  { id: "B2", flow: "B", title: "B2 Banner đã duyệt sẵn", audience: "Hùng", persona: "cus_hung", path: "/grab", orderAmount: 9_000_000 },
  { id: "B3", flow: "B", title: "B3 Hạn mức trả góp", audience: "Hùng", persona: "cus_hung", path: "/grab/limit?from=hub", orderAmount: 9_000_000 },
  { id: "B4", flow: "B", title: "B4 Tài xế mới (thu nhập chưa đủ dữ liệu)", audience: "Hùng (mới)", persona: "cus_hung_new", path: "/grab/limit?from=hub", orderAmount: 5_000_000 },
  { id: "B5", flow: "B", title: "B5 Sau khi mua: khoản trả góp", audience: "Hùng (đang vay)", persona: "cus_hung_loan", path: "/grab/loans" },
  { id: "C1", flow: "C", title: "C1 Thanh toán Shopee", audience: "Phụng · SEG-4", persona: "cus_phung", path: "/shopee/checkout", orderAmount: 14_000_000 },
  { id: "C2", flow: "C", title: "C2 Banner đã duyệt sẵn", audience: "Phụng", persona: "cus_phung", path: "/so-ban-hang", orderAmount: 14_000_000 },
  { id: "C3", flow: "C", title: "C3 Hạn mức trả góp", audience: "Phụng", persona: "cus_phung", path: "/so-ban-hang/limit?from=hub", orderAmount: 14_000_000 },
  { id: "C4", flow: "C", title: "C4 Cửa hàng mới (doanh số chưa đủ dữ liệu)", audience: "Phụng (mới)", persona: "cus_phung_new", path: "/so-ban-hang/limit?from=hub", orderAmount: 8_000_000 },
  { id: "C5", flow: "C", title: "C5 Sau khi mua: khoản trả góp", audience: "Phụng (đang vay)", persona: "cus_phung_loan", path: "/so-ban-hang/loans" },
];
export const ENTRY_BY_ID = Object.fromEntries(ENTRIES.map((e) => [e.id, e])) as Record<string, Entry>;
