import type { ApiCall, Appeal, ConsentReceipt, Contract, Decision, Instalment, Loan, Policy, ProductType, ScenarioName, RankingWeights } from "@/api/types";
import { CUSTOMERS, SEED_RECEIPTS, WEIGHTS } from "./fixtures";
import { money } from "./engine";

const KEY = "hlb-creditpulse-demo";
const VERSION = 6;

export interface StoredOffer {
  offerRequestId: string;
  customerRef: string;
  partnerId: string;
  productType: ProductType;
  amount: number;
  orderRef?: string;
  createdAt: string;
}
export interface StoredDecision extends Decision {
  customerRef: string;
  partnerId: string;
  productType: ProductType;
  amount: number;
  packageId?: string;
}
export interface StoredContract extends Contract {
  decisionId: string;
  customerRef: string;
  partnerId: string;
  productType: ProductType;
  principal: number;
  packageId: string;
}
export interface DB {
  version: number;
  scenario: ScenarioName;
  errorOp?: string;
  emptyMode: boolean;
  consents: ConsentReceipt[];
  ekyc: Record<string, { status: "PASSED" | "FAILED" | "RETRY"; attempts: number; verificationId: string }>;
  offers: Record<string, StoredOffer>;
  decisions: Record<string, StoredDecision>;
  contracts: Record<string, StoredContract>;
  loans: (Loan & { principal: number; orderRef?: string })[];
  /** Customer-requested reassessments (R-25, D-78); the AI decision itself is never edited. */
  appeals: (Appeal & { customerRef: string })[];
  calls: ApiCall[];
  policy: Policy;
  weights: RankingWeights;
  audit: { at: string; actor: string; action: string; detail: string }[];
  drafts?: { policyVersionId: string; productType: string; versionNo: number; status: string; config: Record<string, unknown>; createdBy: string; reason: string }[];
  approvals?: { approvalId: string; kind: string; targetId: string; diff: Record<string, unknown>; reason: string; makerId: string; status: string; expiresAt: string; comment: string }[];
}

let db: DB | null = null;
export let storageOk = true;

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padEnd(12, "0"));
export const newId = uuid;

export function addDays(base: Date, n: number): Date {
  return new Date(base.getTime() + n * 86_400_000);
}
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

export function makeSchedule(opts: { months: number; total: number; paid: number; start?: Date }): Instalment[] {
  const n = opts.months;
  const each = Math.round(opts.total / n / 1000) * 1000;
  const start = opts.start ?? new Date();
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    dueDate: dateOnly(addDays(start, 30 * (i + 1))),
    amount: money(i === n - 1 ? opts.total - each * (n - 1) : each),
    status: i < opts.paid ? ("PAID" as const) : ("DUE" as const),
  }));
}

function seedLoan(o: { ref: string; partner: string; product: ProductType; principal: number; total: number; months: number; paid: number; orderRef?: string; eir: number }) {
  const start = addDays(new Date(), -30 * o.paid);
  const schedule = makeSchedule({ months: o.months, total: o.total, paid: o.paid, start });
  const remainingTotal = schedule.filter((s) => s.status !== "PAID").reduce((a, s) => a + s.amount.amount, 0);
  return {
    loanId: newId(), customerRef: o.ref, partnerId: o.partner as never, productType: o.product, status: "ACTIVE" as const,
    principalRemaining: money(Math.round(o.principal * (remainingTotal / o.total))), totalRemaining: money(remainingTotal), eir: o.eir, schedule, principal: o.principal, orderRef: o.orderRef,
  };
}

function seed(): DB {
  const now = new Date();
  const loans = [
    seedLoan({ ref: "cus_khoa", partner: "viettel-money", product: "PAYMENT_INSTALLMENT", principal: 8_500_000, total: 8_925_000, months: 6, paid: 3, eir: 0.098, orderRef: "SPE-2026-0107" }),
    seedLoan({ ref: "cus_mai_loan", partner: "viettel-money", product: "PAYMENT_INSTALLMENT", principal: 12_000_000, total: 12_000_000, months: 6, paid: 1, eir: 0, orderRef: "SPE-2026-0001" }),
    seedLoan({ ref: "cus_hung_loan", partner: "grab", product: "PAYMENT_INSTALLMENT", principal: 8_000_000, total: 8_400_000, months: 9, paid: 3, eir: 0.097, orderRef: "SPE-2026-0131" }),
    seedLoan({ ref: "cus_phung_loan", partner: "so-ban-hang", product: "PAYMENT_INSTALLMENT", principal: 15_000_000, total: 15_000_000, months: 6, paid: 2, eir: 0, orderRef: "SPE-2026-0152" }),
    ...[0, 1, 2].map((k) => seedLoan({ ref: "cus_an", partner: "viettel-money", product: "PAYMENT_INSTALLMENT", principal: 3_000_000 + k * 500_000, total: 3_150_000 + k * 525_000, months: 6, paid: 1, eir: 0.098, orderRef: `SPE-2026-02${k}` })),
  ];
  // An's second loan has one instalment a day late (AC-21.3, AC-15.2).
  const lateLoan = loans.filter((l) => l.customerRef === "cus_an")[0];
  const lateItem = lateLoan?.schedule.find((x) => x.status === "DUE");
  if (lateItem) { lateItem.status = "LATE"; lateItem.dueDate = dateOnly(addDays(new Date(), -1)); }
  const mk = (ref: string, partner: string, product: ProductType, amount: number, outcome: Decision["outcome"], latency: number, daysAgo: number, approved?: number): StoredDecision => ({
    decisionId: newId(), outcome, latencyMs: latency, decidedAt: addDays(now, -daysAgo).toISOString(), customerRef: ref, partnerId: partner, productType: product, amount,
    requestedAmount: money(amount), approvedAmount: outcome === "DECLINED" ? undefined : money(approved ?? amount), tenorMonths: 6, reasonCodes: [], explanationText: "", dataUsed: [], waterfall: [],
    ratings: { riskGrade: "B", affordability: money(3_200_000), integrity: "PASS", limit: money(15_000_000) },
    appealable: outcome !== "APPROVED", appealDeadline: outcome !== "APPROVED" ? addDays(now, 30 - daysAgo).toISOString() : undefined,
  });
  const decisions: StoredDecision[] = [
    mk("cus_khoa", "viettel-money", "PAYMENT_INSTALLMENT", 8_500_000, "APPROVED", 800, 6),
    mk("cus_tung", "viettel-money", "PAYMENT_INSTALLMENT", 2_000_000, "APPROVED", 2400, 5),
    mk("cus_hung_loan", "grab", "PAYMENT_INSTALLMENT", 8_000_000, "APPROVED", 2100, 4),
    mk("cus_phung_loan", "so-ban-hang", "PAYMENT_INSTALLMENT", 15_000_000, "APPROVED", 2600, 3),
    mk("cus_binh", "viettel-money", "PAYMENT_INSTALLMENT", 45_000_000, "COUNTER_OFFER", 2900, 1, 20_000_000),
    mk("cus_lan", "grab", "PAYMENT_INSTALLMENT", 12_000_000, "DECLINED", 1900, 3),
    mk("cus_chi", "viettel-money", "PAYMENT_INSTALLMENT", 18_000_000, "DECLINED", 1700, 4),
  ];
  decisions[4].reasonCodes = ["DEVICE_SHARED"]; decisions[4].ratings.integrity = "REVIEW";
  decisions[4].explanationText = "Thiết bị này được nhiều người dùng để đăng ký vay, nên số tiền được duyệt thấp hơn đề nghị.";
  decisions[5].reasonCodes = ["INCOME_LOW"]; decisions[5].explanationText = "Thu nhập ước tính chưa đủ so với khoản trả hằng tháng.";
  decisions[6].reasonCodes = ["AFFORDABILITY"]; decisions[6].explanationText = "Khoản trả hằng tháng vượt khả năng chi trả ước tính (mức trần DTI).";
  const ap = (d: StoredDecision, ref: string, hoursAgo: number, dueInHours: number, note: string, extra: Partial<Appeal> = {}) => ({
    appealId: newId(), referenceNo: `HLB-XL-2026-000${120 + Math.round(hoursAgo)}`, decisionId: d.decisionId, customerRef: ref, customerMask: `cus_…${ref.replace("cus_", "").slice(0, 6)}`,
    partnerId: d.partnerId as never, productType: d.productType, aiOutcome: d.outcome, requestedAmount: money(d.amount), aiAmount: d.approvedAmount, reasonCodes: d.reasonCodes, note, channel: "PARTNER_APP" as const,
    status: "OPEN" as const, createdAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(), dueAt: new Date(now.getTime() + dueInHours * 3_600_000).toISOString(), slaState: "GREEN" as const, ...extra,
  });
  const appeals = [
    ap(decisions[4], "cus_binh", 6, 30, "Điện thoại này là của gia đình tôi, mọi người dùng chung. Tôi có lương ổn định, mong HLB xem xét lại."),
    ap(decisions[5], "cus_lan", 52, -4, "Tháng trước tôi nghỉ ốm hai tuần nên thu nhập giảm. Bình thường tôi chạy đều mỗi ngày."),
    ap(decisions[6], "cus_chi", 70, -22, "Tôi vừa được tăng lương.", { status: "OVERTURNED" as const, outcome: "OVERTURNED" as const, outcomeReasonCode: "INCOME_VERIFIED", newOffer: money(18_000_000), decidedBy: "reviewer.demo@hlb", decidedAt: addDays(now, -1).toISOString(), offerValidUntil: addDays(now, 6).toISOString() }),
  ];
  return {
    version: VERSION, scenario: "APPROVE", emptyMode: false,
    consents: SEED_RECEIPTS(), ekyc: {}, offers: {}, decisions: Object.fromEntries(decisions.map((d) => [d.decisionId, d])), contracts: {},
    loans, appeals, calls: [],
    policy: { dtiCap: 0.35, maxOpenLoans: 3, cicRefreshOnLimitChange: true, testBandShare: 0.03, championModel: "v1", rungCaps: [3, 8, 15, 30, 50].map((m) => money(m * 1_000_000)) },
    weights: { ...WEIGHTS }, audit: [], drafts: [], approvals: [],
  };
}

function load(): DB | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DB;
    return parsed.version === VERSION ? parsed : null;
  } catch {
    storageOk = false;
    return null;
  }
}

export function getDb(): DB {
  if (!db) db = load() ?? seed();
  return db;
}
export function saveDb() {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(getDb()));
  } catch {
    storageOk = false;
  }
}
export function resetDemoData() {
  const keep = db ? { scenario: db.scenario } : null;
  db = seed();
  if (keep) db.scenario = "APPROVE";
  saveDb();
}
export const customers = CUSTOMERS;
