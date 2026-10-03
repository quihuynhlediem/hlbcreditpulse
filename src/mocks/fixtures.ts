import type { ConsentReceipt, PartnerId, ProductType, Segment, SourceId } from "@/api/types";

/** Alternative-data catalogue (Step 07 §4). Rank follows the weighted ranking (D-20). */
export interface SourceDef {
  id: SourceId;
  name: string;
  rank: number;
  rankLabel: string;
  outputs: ("RG" | "AF" | "IN" | "LM")[];
  role: string;
  ratings: { predictive: number; coverage: number; cost: number; access: number; legal: number };
  costVnd: number;
  latencyMs: number;
}

export const SOURCES: SourceDef[] = [
  { id: "B-01", name: "CCCD gắn chip + khuôn mặt", rank: 0, rankLabel: "Nền tảng", outputs: ["IN"], role: "Danh tính", ratings: { predictive: 0, coverage: 0, cost: 0, access: 0, legal: 0 }, costVnd: 0, latencyMs: 60 },
  { id: "B-02", name: "Hồ sơ CIC", rank: 0, rankLabel: "Nền tảng", outputs: ["RG", "AF"], role: "Nghĩa vụ hiện có", ratings: { predictive: 0, coverage: 0, cost: 0, access: 0, legal: 0 }, costVnd: 21000, latencyMs: 900 },
  { id: "AD-01", name: "Lịch sử ví", rank: 1, rankLabel: "#1", outputs: ["RG", "AF"], role: "Thu nhập đều", ratings: { predictive: 4, coverage: 5, cost: 4, access: 4, legal: 3 }, costVnd: 2000, latencyMs: 310 },
  { id: "AD-02", name: "Dữ liệu thanh toán và thiết bị", rank: 2, rankLabel: "#2", outputs: ["IN"], role: "Thiết bị nhất quán", ratings: { predictive: 3, coverage: 5, cost: 5, access: 4, legal: 3 }, costVnd: 0, latencyMs: 40 },
  { id: "AD-03", name: "Tài khoản lương HLB", rank: 3, rankLabel: "#3", outputs: ["AF", "RG"], role: "Lương đều hằng tháng", ratings: { predictive: 4, coverage: 2, cost: 5, access: 5, legal: 4 }, costVnd: 0, latencyMs: 120 },
  { id: "AD-10", name: "Điểm viễn thông (đơn vị được cấp phép)", rank: 4, rankLabel: "#4", outputs: ["RG"], role: "Số điện thoại ổn định", ratings: { predictive: 4, coverage: 5, cost: 3, access: 3, legal: 2 }, costVnd: 3000, latencyMs: 700 },
  { id: "AD-04", name: "Hành vi nạp tiền của ví", rank: 5, rankLabel: "#5=", outputs: ["RG"], role: "Nạp tiền đều đặn", ratings: { predictive: 3, coverage: 4, cost: 4, access: 4, legal: 3 }, costVnd: 1000, latencyMs: 220 },
  { id: "AD-05", name: "Thanh toán hóa đơn", rank: 5, rankLabel: "#5=", outputs: ["RG"], role: "Trả đúng hạn", ratings: { predictive: 3, coverage: 4, cost: 4, access: 3, legal: 4 }, costVnd: 1500, latencyMs: 250 },
  { id: "AD-06", name: "Open API ngân hàng khác (từ 1/3/2027)", rank: 7, rankLabel: "#7", outputs: ["AF", "RG"], role: "Dòng tiền ngân hàng khác", ratings: { predictive: 4, coverage: 3, cost: 4, access: 2, legal: 4 }, costVnd: 2500, latencyMs: 800 },
  { id: "AD-07", name: "Thu nhập trên Grab", rank: 8, rankLabel: "#8=", outputs: ["AF", "RG"], role: "Thu nhập đều trên ứng dụng", ratings: { predictive: 4, coverage: 2, cost: 4, access: 2, legal: 3 }, costVnd: 1500, latencyMs: 300 },
  { id: "AD-08", name: "Doanh số bán hàng", rank: 8, rankLabel: "#8=", outputs: ["AF", "RG"], role: "Doanh số ổn định", ratings: { predictive: 4, coverage: 2, cost: 4, access: 2, legal: 3 }, costVnd: 1500, latencyMs: 300 },
  { id: "AD-09", name: "Lịch sử trả nợ HLB", rank: 1, rankLabel: "#1 khi tái xét", outputs: ["RG", "LM"], role: "Trả nợ đúng hạn", ratings: { predictive: 5, coverage: 2, cost: 5, access: 5, legal: 4 }, costVnd: 0, latencyMs: 20 },
];
export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<SourceId, SourceDef>;

export const WEIGHTS = { predictive: 0.3, coverage: 0.25, cost: 0.15, access: 0.15, legal: 0.15 };

export interface RungDef {
  rung: number;
  sources: SourceId[];
  cap: number;
  text: string;
}

export interface CustomerFixture {
  ref: string;
  name: string;
  display: string;
  segment: Segment;
  partnerId: PartnerId;
  productType: ProductType;
  /** Limit shown before any consent when the partner holds a pre-screen result. */
  prescreenLimit?: number;
  locked?: { reason: string };
  rungs: RungDef[];
  /** Sources already connected (seed consent receipts). */
  seedConsents: SourceId[];
  /** Affordability per month: base plus increments per connected source. */
  afBase: number;
  afBySource: Partial<Record<SourceId, number>>;
  ekycDone: boolean;
  openLoans: number;
  cic: "NO_FILE" | "FILE_FOUND";
  riskGrade: "A" | "B" | "C" | "D" | "E";
}

const M = 1_000_000;
export const CUSTOMERS: CustomerFixture[] = [
  {
    ref: "cus_mai", name: "Mai", display: "Mai · SEG-2 lương, chưa có CIC", segment: "SEG-2", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT",
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: "Hạn mức khởi đầu" },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: "Lịch sử ví" },
      { rung: 3, sources: ["AD-05"], cap: 15 * M, text: "Thanh toán hóa đơn" },
      { rung: 4, sources: ["AD-03"], cap: 30 * M, text: "Tài khoản lương HLB" },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 2.2 * M, "AD-05": 1.0 * M, "AD-03": 1.3 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "B",
  },
  {
    ref: "cus_khoa", name: "Khoa", display: "Khoa · SEG-1 lương, có CIC", segment: "SEG-1", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT", prescreenLimit: 30 * M,
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: "Hạn mức khởi đầu" },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: "Lịch sử ví" },
      { rung: 3, sources: ["AD-05"], cap: 15 * M, text: "Thanh toán hóa đơn" },
      { rung: 4, sources: ["B-02", "AD-03"], cap: 30 * M, text: "CIC và tài khoản lương HLB" },
    ],
    seedConsents: ["AD-01", "AD-05", "B-02", "AD-03"], afBase: 0, afBySource: { "AD-01": 2 * M, "AD-05": 1 * M, "B-02": 1 * M, "AD-03": 3 * M }, ekycDone: true, openLoans: 1, cic: "FILE_FOUND", riskGrade: "A",
  },
  {
    ref: "cus_tung", name: "Tùng", display: "Tùng · SEG-5 lần đầu số hóa", segment: "SEG-5", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT",
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 2 * M, text: "Hạn mức khởi đầu" },
      { rung: 2, sources: ["AD-01"], cap: 5 * M, text: "Lịch sử ví" },
      { rung: 3, sources: ["AD-05"], cap: 8 * M, text: "Thanh toán hóa đơn" },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 0.9 * M, "AD-05": 0.5 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "C",
  },
  {
    ref: "cus_hung", name: "Hùng", display: "Hùng · SEG-3 tài xế Grab", segment: "SEG-3", partnerId: "grab", productType: "DRIVER_INSTANT_LOAN", prescreenLimit: 20 * M,
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: "Hạn mức khởi đầu" },
      { rung: 5, sources: ["AD-07"], cap: 20 * M, text: "Thu nhập trên Grab" },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-07": 1.8 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "B",
  },
  {
    ref: "cus_hung_new", name: "Hùng (mới)", display: "Hùng (mới) · tài xế dưới 3 tháng", segment: "SEG-3", partnerId: "grab", productType: "DRIVER_INSTANT_LOAN",
    locked: { reason: "Cần hoạt động ít nhất 3 tháng trên Grab để mở khóa. Hoạt động thêm 45 ngày để mở khóa." },
    rungs: [{ rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: "Hạn mức khởi đầu" }],
    seedConsents: [], afBase: 0, afBySource: {}, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "C",
  },
  {
    ref: "cus_phung", name: "Phụng", display: "Phụng · SEG-4 chủ cửa hàng", segment: "SEG-4", partnerId: "so-ban-hang", productType: "SELLER_FUNDING", prescreenLimit: 50 * M,
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 5 * M, text: "Hạn mức khởi đầu" },
      { rung: 5, sources: ["AD-08"], cap: 50 * M, text: "Doanh số bán hàng" },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-08": 8 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "B",
  },
  {
    ref: "cus_an", name: "An", display: "An · đã có 3 khoản (chặn chồng nợ)", segment: "SEG-5", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT", prescreenLimit: 20 * M,
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: "Hạn mức khởi đầu" },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: "Lịch sử ví" },
    ],
    seedConsents: ["AD-01"], afBase: 0, afBySource: { "AD-01": 2 * M }, ekycDone: true, openLoans: 3, cic: "NO_FILE", riskGrade: "C",
  },
];
function clone(base: string, over: Partial<CustomerFixture>): CustomerFixture {
  const b = CUSTOMERS.find((c) => c.ref === base)!;
  return { ...b, ...over };
}
CUSTOMERS.push(
  clone("cus_mai", { ref: "cus_mai_loan", name: "Mai (đang trả góp)", display: "Mai (đang trả góp) · đã có khoản 12 triệu", seedConsents: ["AD-01", "AD-05"], ekycDone: true, openLoans: 1 }),
  clone("cus_hung", { ref: "cus_hung_loan", name: "Hùng (đang vay)", display: "Hùng (đang vay) · khoản 8 triệu", seedConsents: ["AD-07"], ekycDone: true, openLoans: 1 }),
  clone("cus_phung", { ref: "cus_phung_loan", name: "Phụng (đang vay)", display: "Phụng (đang vay) · khoản 30 triệu", seedConsents: ["AD-08"], ekycDone: true, openLoans: 1 }),
);
export const CUSTOMER_BY_REF = Object.fromEntries(CUSTOMERS.map((c) => [c.ref, c])) as Record<string, CustomerFixture>;

export const SEED_RECEIPTS = (): ConsentReceipt[] => {
  const out: ConsentReceipt[] = [];
  let n = 0;
  for (const c of CUSTOMERS) {
    for (const s of c.seedConsents) {
      n += 1;
      out.push({
        receiptId: `c0a1f0aa-0000-4000-8000-${String(n).padStart(12, "0")}`,
        customerRef: c.ref, partnerId: c.partnerId, sourceId: s, purpose: "Đánh giá khả năng trả nợ",
        status: "GRANTED", grantedAt: "2026-09-28T09:00:00Z",
      });
    }
  }
  out.push({ receiptId: "c0a1f0cc-0000-4000-8000-0000000000d9", customerRef: "cus_an", partnerId: "viettel-money", sourceId: "AD-05", purpose: "Đánh giá khả năng trả nợ", status: "WITHDRAWN", grantedAt: "2026-09-20T18:40:00Z", withdrawnAt: "2026-10-01T18:40:00Z" });
  return out;
};
