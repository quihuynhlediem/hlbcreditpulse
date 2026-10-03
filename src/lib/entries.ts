/** Demo entry points (R-20): at least 3 per flow, each fitting a target audience (Step 09 §1.2). */
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
  A: "Luồng A — Viettel Money (khách cá nhân)",
  B: "Luồng B — Grab (tài xế)",
  C: "Luồng C — Sổ Bán Hàng (chủ cửa hàng)",
} as const;

export const ENTRIES: Entry[] = [
  { id: "A1", flow: "A", title: "A1 Thanh toán Shopee", audience: "Mai · SEG-2", persona: "cus_mai", path: "/shopee/checkout", orderAmount: 12_000_000 },
  { id: "A2", flow: "A", title: "A2 Banner đã duyệt sẵn", audience: "Khoa · SEG-1", persona: "cus_khoa", path: "/viettel-money", orderAmount: 8_500_000 },
  { id: "A3", flow: "A", title: "A3 Hạn mức trả góp", audience: "Tùng · SEG-5", persona: "cus_tung", path: "/viettel-money/limit?from=hub", orderAmount: 5_000_000 },
  { id: "A4", flow: "A", title: "A4 TikTok Shop / Lazada (v1)", audience: "Khách lương", persona: "cus_mai", path: "/shopee/checkout?skin=tiktok", orderAmount: 12_000_000, v1: true },
  { id: "B1", flow: "B", title: 'B1 Ô "Vay nhanh" ở trang chủ', audience: "Hùng · SEG-3", persona: "cus_hung", path: "/grab" },
  { id: "B2", flow: "B", title: "B2 Banner ở màn Thu nhập", audience: "Hùng", persona: "cus_hung", path: "/grab/earnings" },
  { id: "B3", flow: "B", title: "B3 Thông báo sau khi nhận tiền", audience: "Hùng (đang vay)", persona: "cus_hung_loan", path: "/grab/loan/schedule?push=1" },
  { id: "B4", flow: "B", title: "B4 Tài xế mới (bị khóa) (v1)", audience: "Hùng (mới)", persona: "cus_hung_new", path: "/grab" },
  { id: "C1", flow: "C", title: 'C1 Thẻ "Vốn kinh doanh"', audience: "Phụng · SEG-4", persona: "cus_phung", path: "/so-ban-hang" },
  { id: "C2", flow: "C", title: "C2 Banner ở báo cáo Thu chi", audience: "Phụng", persona: "cus_phung", path: "/so-ban-hang/report" },
  { id: "C3", flow: "C", title: "C3 Trả góp tiền nhập hàng", audience: "Phụng", persona: "cus_phung", path: "/so-ban-hang/restock/PO-0412" },
  { id: "C4", flow: "C", title: "C4 Tiền hàng về → trả nợ (v1)", audience: "Phụng (đang vay)", persona: "cus_phung_loan", path: "/so-ban-hang/funding/tracker", v1: true },
];
export const ENTRY_BY_ID = Object.fromEntries(ENTRIES.map((e) => [e.id, e])) as Record<string, Entry>;
