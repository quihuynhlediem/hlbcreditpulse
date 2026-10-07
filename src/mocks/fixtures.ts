import type { ConsentReceipt, PartnerId, ProductType, Segment, SourceId } from "@/api/types";
import { tKey } from "@/i18n";

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
  { id: "B-01", name: tKey("CCCD gắn chip + khuôn mặt"), rank: 0, rankLabel: tKey("Nền tảng"), outputs: ["IN"], role: tKey("Danh tính"), ratings: { predictive: 0, coverage: 0, cost: 0, access: 0, legal: 0 }, costVnd: 0, latencyMs: 60 },
  { id: "B-02", name: tKey("Hồ sơ CIC"), rank: 0, rankLabel: tKey("Nền tảng"), outputs: ["RG", "AF"], role: tKey("Nghĩa vụ hiện có"), ratings: { predictive: 0, coverage: 0, cost: 0, access: 0, legal: 0 }, costVnd: 21000, latencyMs: 900 },
  { id: "AD-01", name: tKey("Lịch sử ví"), rank: 1, rankLabel: "#1", outputs: ["RG", "AF"], role: tKey("Thu nhập đều"), ratings: { predictive: 4, coverage: 5, cost: 4, access: 4, legal: 3 }, costVnd: 2000, latencyMs: 310 },
  { id: "AD-02", name: tKey("Dữ liệu thanh toán và thiết bị"), rank: 2, rankLabel: "#2", outputs: ["IN"], role: tKey("Thiết bị nhất quán"), ratings: { predictive: 3, coverage: 5, cost: 5, access: 4, legal: 3 }, costVnd: 0, latencyMs: 40 },
  { id: "AD-03", name: tKey("Tài khoản lương HLB"), rank: 3, rankLabel: "#3", outputs: ["AF", "RG"], role: tKey("Lương đều hằng tháng"), ratings: { predictive: 4, coverage: 2, cost: 5, access: 5, legal: 4 }, costVnd: 0, latencyMs: 120 },
  { id: "AD-10", name: tKey("Điểm viễn thông (đơn vị được cấp phép)"), rank: 4, rankLabel: "#4", outputs: ["RG"], role: tKey("Số điện thoại ổn định"), ratings: { predictive: 4, coverage: 5, cost: 3, access: 3, legal: 2 }, costVnd: 3000, latencyMs: 700 },
  { id: "AD-04", name: tKey("Hành vi nạp tiền của ví"), rank: 5, rankLabel: "#5=", outputs: ["RG"], role: tKey("Nạp tiền đều đặn"), ratings: { predictive: 3, coverage: 4, cost: 4, access: 4, legal: 3 }, costVnd: 1000, latencyMs: 220 },
  { id: "AD-05", name: tKey("Thanh toán hóa đơn"), rank: 5, rankLabel: "#5=", outputs: ["RG"], role: tKey("Trả đúng hạn"), ratings: { predictive: 3, coverage: 4, cost: 4, access: 3, legal: 4 }, costVnd: 1500, latencyMs: 250 },
  { id: "AD-06", name: tKey("Open API ngân hàng khác (từ 1/3/2027)"), rank: 7, rankLabel: "#7", outputs: ["AF", "RG"], role: tKey("Dòng tiền ngân hàng khác"), ratings: { predictive: 4, coverage: 3, cost: 4, access: 2, legal: 4 }, costVnd: 2500, latencyMs: 800 },
  { id: "AD-07", name: tKey("Thu nhập trên Grab"), rank: 8, rankLabel: "#8=", outputs: ["AF", "RG"], role: tKey("Thu nhập đều trên ứng dụng"), ratings: { predictive: 4, coverage: 2, cost: 4, access: 2, legal: 3 }, costVnd: 1500, latencyMs: 300 },
  { id: "AD-08", name: tKey("Doanh số bán hàng"), rank: 8, rankLabel: "#8=", outputs: ["AF", "RG"], role: tKey("Doanh số ổn định"), ratings: { predictive: 4, coverage: 2, cost: 4, access: 2, legal: 3 }, costVnd: 1500, latencyMs: 300 },
  { id: "AD-09", name: tKey("Lịch sử trả nợ HLB"), rank: 1, rankLabel: tKey("#1 khi tái xét"), outputs: ["RG", "LM"], role: tKey("Trả nợ đúng hạn"), ratings: { predictive: 5, coverage: 2, cost: 5, access: 5, legal: 4 }, costVnd: 0, latencyMs: 20 },
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
  /** Sources that never have enough history for this customer (a new driver's earnings, a new seller's sales). */
  thinSources?: SourceId[];
  /** Full name shown on the e-commerce delivery address. */
  fullName: string;
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
    ref: "cus_mai", name: "Mai", display: tKey("Mai · SEG-2 lương, chưa có CIC"), segment: "SEG-2", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT", fullName: tKey("Nguyễn Thị Mai"),
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: tKey("Lịch sử ví") },
      { rung: 3, sources: ["AD-05"], cap: 15 * M, text: tKey("Thanh toán hóa đơn") },
      { rung: 4, sources: ["AD-03"], cap: 30 * M, text: tKey("Tài khoản lương HLB") },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 2.2 * M, "AD-05": 1.0 * M, "AD-03": 1.3 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "B",
  },
  {
    ref: "cus_khoa", name: "Khoa", display: tKey("Khoa · SEG-1 lương, có CIC"), segment: "SEG-1", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT", prescreenLimit: 30 * M, fullName: tKey("Trần Minh Khoa"),
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: tKey("Lịch sử ví") },
      { rung: 3, sources: ["AD-05"], cap: 15 * M, text: tKey("Thanh toán hóa đơn") },
      { rung: 4, sources: ["B-02", "AD-03"], cap: 30 * M, text: tKey("CIC và tài khoản lương HLB") },
    ],
    seedConsents: ["AD-01", "AD-05", "B-02", "AD-03"], afBase: 0, afBySource: { "AD-01": 2 * M, "AD-05": 1 * M, "B-02": 1 * M, "AD-03": 3 * M }, ekycDone: true, openLoans: 1, cic: "FILE_FOUND", riskGrade: "A",
  },
  {
    ref: "cus_tung", name: tKey("Tùng"), display: tKey("Tùng · SEG-5 lần đầu số hóa"), segment: "SEG-5", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT", fullName: tKey("Lê Văn Tùng"),
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 2 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 5 * M, text: tKey("Lịch sử ví") },
      { rung: 3, sources: ["AD-05"], cap: 8 * M, text: tKey("Thanh toán hóa đơn") },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 0.9 * M, "AD-05": 0.5 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "C",
  },
  {
    ref: "cus_hung", name: tKey("Hùng"), display: tKey("Hùng · SEG-3 tài xế Grab"), segment: "SEG-3", partnerId: "grab", productType: "PAYMENT_INSTALLMENT", prescreenLimit: 20 * M, fullName: tKey("Phạm Văn Hùng"),
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: tKey("Lịch sử ví Grab") },
      { rung: 5, sources: ["AD-07"], cap: 20 * M, text: tKey("Thu nhập trên Grab") },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 1.0 * M, "AD-07": 1.8 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "B",
  },
  {
    ref: "cus_hung_new", name: tKey("Hùng (mới)"), display: tKey("Hùng (mới) · tài xế dưới 3 tháng"), segment: "SEG-3", partnerId: "grab", productType: "PAYMENT_INSTALLMENT", fullName: tKey("Phạm Văn Hùng"), thinSources: ["AD-07"],
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: tKey("Lịch sử ví Grab") },
      { rung: 5, sources: ["AD-07"], cap: 20 * M, text: tKey("Thu nhập trên Grab") },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 1.0 * M, "AD-07": 1.8 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "C",
  },
  {
    ref: "cus_phung", name: tKey("Phụng"), display: tKey("Phụng · SEG-4 chủ cửa hàng"), segment: "SEG-4", partnerId: "so-ban-hang", productType: "PAYMENT_INSTALLMENT", prescreenLimit: 50 * M, fullName: tKey("Võ Thị Phụng"),
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 5 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 15 * M, text: tKey("Lịch sử ví Sổ Bán Hàng") },
      { rung: 5, sources: ["AD-08"], cap: 50 * M, text: tKey("Doanh số bán hàng") },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 1.5 * M, "AD-08": 8 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "B",
  },
  {
    ref: "cus_phung_new", name: tKey("Phụng (mới)"), display: tKey("Phụng (mới) · cửa hàng dưới 90 ngày"), segment: "SEG-4", partnerId: "so-ban-hang", productType: "PAYMENT_INSTALLMENT", fullName: tKey("Võ Thị Phụng"), thinSources: ["AD-08"],
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 5 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 15 * M, text: tKey("Lịch sử ví Sổ Bán Hàng") },
      { rung: 5, sources: ["AD-08"], cap: 50 * M, text: tKey("Doanh số bán hàng") },
    ],
    seedConsents: [], afBase: 0, afBySource: { "AD-01": 1.5 * M, "AD-08": 8 * M }, ekycDone: false, openLoans: 0, cic: "NO_FILE", riskGrade: "C",
  },
  {
    ref: "cus_an", name: "An", display: tKey("An · đã có 3 khoản (chặn chồng nợ)"), segment: "SEG-5", partnerId: "viettel-money", productType: "PAYMENT_INSTALLMENT", prescreenLimit: 20 * M, fullName: tKey("Đỗ Thu An"),
    rungs: [
      { rung: 1, sources: ["B-01", "AD-02"], cap: 3 * M, text: tKey("Hạn mức khởi đầu") },
      { rung: 2, sources: ["AD-01"], cap: 8 * M, text: tKey("Lịch sử ví") },
    ],
    seedConsents: ["AD-01"], afBase: 0, afBySource: { "AD-01": 2 * M }, ekycDone: true, openLoans: 3, cic: "NO_FILE", riskGrade: "C",
  },
];
function clone(base: string, over: Partial<CustomerFixture>): CustomerFixture {
  const b = CUSTOMERS.find((c) => c.ref === base)!;
  return { ...b, ...over };
}
CUSTOMERS.push(
  clone("cus_mai", { ref: "cus_mai_loan", name: tKey("Mai (đang trả góp)"), display: tKey("Mai (đang trả góp) · đã có khoản 12 triệu"), seedConsents: ["AD-01", "AD-05"], ekycDone: true, openLoans: 1 }),
  clone("cus_hung", { ref: "cus_hung_loan", name: tKey("Hùng (đang vay)"), display: tKey("Hùng (đang vay) · khoản 8 triệu"), seedConsents: ["AD-01", "AD-07"], ekycDone: true, openLoans: 1 }),
  clone("cus_phung", { ref: "cus_phung_loan", name: tKey("Phụng (đang vay)"), display: tKey("Phụng (đang vay) · khoản 15 triệu"), seedConsents: ["AD-01", "AD-08"], ekycDone: true, openLoans: 1 }),
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
        customerRef: c.ref, partnerId: c.partnerId, sourceId: s, purpose: tKey("Đánh giá khả năng trả nợ"),
        status: "GRANTED", grantedAt: "2026-09-28T09:00:00Z",
      });
    }
  }
  out.push({ receiptId: "c0a1f0cc-0000-4000-8000-0000000000d9", customerRef: "cus_an", partnerId: "viettel-money", sourceId: "AD-05", purpose: tKey("Đánh giá khả năng trả nợ"), status: "WITHDRAWN", grantedAt: "2026-09-20T18:40:00Z", withdrawnAt: "2026-10-01T18:40:00Z" });
  return out;
};
