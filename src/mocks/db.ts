import type { ApiCall, ConsentReceipt, Contract, Decision, Instalment, Loan, ManualCase, Policy, ProductType, ScenarioName, RankingWeights } from "@/api/types";
import { CUSTOMERS, SEED_RECEIPTS, WEIGHTS } from "./fixtures";
import { money } from "./engine";

const KEY = "hlb-creditpulse-demo";
const VERSION = 4;

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
  /** Recent payout incomes per loan (AC-25.2: two drops of more than 50% scale deductions down). */
  payouts?: Record<string, number[]>;
  emptyMode: boolean;
  consents: ConsentReceipt[];
  ekyc: Record<string, { status: "PASSED" | "FAILED" | "RETRY"; attempts: number; verificationId: string }>;
  offers: Record<string, StoredOffer>;
  decisions: Record<string, StoredDecision>;
  contracts: Record<string, StoredContract>;
  loans: (Loan & { principal: number; orderRef?: string })[];
  manual: ManualCase[];
  calls: ApiCall[];
  policy: Policy;
  weights: RankingWeights;
  audit: { at: string; actor: string; action: string; detail: string }[];
}

let db: DB | null = null;
export let storageOk = true;

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padEnd(12, "0"));
export const newId = uuid;

export function addDays(base: Date, n: number): Date {
  return new Date(base.getTime() + n * 86_400_000);
}
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

export function makeSchedule(opts: { months: number; total: number; paid: number; weekly?: boolean; start?: Date }): Instalment[] {
  const n = opts.weekly ? Math.round((opts.months * 52) / 12) : opts.months;
  const each = Math.round(opts.total / n / 1000) * 1000;
  const start = opts.start ?? new Date();
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    dueDate: dateOnly(addDays(start, opts.weekly ? 7 * (i + 1) : 30 * (i + 1))),
    amount: money(i === n - 1 ? opts.total - each * (n - 1) : each),
    status: i < opts.paid ? ("PAID" as const) : ("DUE" as const),
  }));
}

function seedLoan(o: { ref: string; partner: string; product: ProductType; principal: number; total: number; months: number; paid: number; weekly?: boolean; orderRef?: string; eir: number }) {
  const start = addDays(new Date(), -30 * o.paid);
  const schedule = makeSchedule({ months: o.months, total: o.total, paid: o.paid, weekly: o.weekly, start });
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
    seedLoan({ ref: "cus_hung_loan", partner: "grab", product: "DRIVER_INSTANT_LOAN", principal: 8_000_000, total: 8_880_000, months: 12, paid: 18, weekly: true, eir: 0.216 }),
    seedLoan({ ref: "cus_phung_loan", partner: "so-ban-hang", product: "SELLER_FUNDING", principal: 30_000_000, total: 33_000_000, months: 12, paid: 2, eir: 0.195 }),
    ...[0, 1, 2].map((k) => seedLoan({ ref: "cus_an", partner: "viettel-money", product: "PAYMENT_INSTALLMENT", principal: 3_000_000 + k * 500_000, total: 3_150_000 + k * 525_000, months: 6, paid: 1, eir: 0.098, orderRef: `SPE-2026-02${k}` })),
  ];
  // An's second loan has one instalment a day late (AC-21.3, AC-15.2).
  const lateLoan = loans.filter((l) => l.customerRef === "cus_an")[0];
  const lateItem = lateLoan?.schedule.find((x) => x.status === "DUE");
  if (lateItem) { lateItem.status = "LATE"; lateItem.dueDate = dateOnly(addDays(new Date(), -1)); }
  // Phụng's loan sits at day 45 of the 60-day minimum window (AC-28.2): a settlement resets it.
  const pl = loans.find((l) => l.customerRef === "cus_phung_loan");
  const pItem = pl?.schedule.find((x) => x.status === "DUE");
  if (pItem) pItem.dueDate = dateOnly(addDays(new Date(), 15));
  // Hùng's loan: current week is a zero-income week (SCR-46).
  const hl = loans.find((l) => l.customerRef === "cus_hung_loan")!;
  const cur = hl.schedule.find((s) => s.status === "DUE");
  if (cur) { cur.amount = money(0); cur.status = "PAUSED"; }

  const mk = (ref: string, partner: string, product: ProductType, amount: number, outcome: Decision["outcome"], tier: Decision["tier"], latency: number, daysAgo: number): StoredDecision => ({
    decisionId: newId(), outcome, tier, latencyMs: latency, decidedAt: addDays(now, -daysAgo).toISOString(), customerRef: ref, partnerId: partner, productType: product, amount,
    approvedAmount: outcome === "APPROVED" ? money(amount) : undefined, tenorMonths: 6, reasonCodes: [], explanationText: "", dataUsed: [], waterfall: [], ratings: { riskGrade: "B", affordability: money(3_200_000), integrity: "PASS", limit: money(15_000_000) },
  });
  const decisions: StoredDecision[] = [
    mk("cus_khoa", "viettel-money", "PAYMENT_INSTALLMENT", 8_500_000, "APPROVED", "STP", 800, 6),
    mk("cus_tung", "viettel-money", "PAYMENT_INSTALLMENT", 2_000_000, "APPROVED", "STP", 2400, 5),
    mk("cus_hung_loan", "grab", "DRIVER_INSTANT_LOAN", 8_000_000, "APPROVED", "STP", 2100, 4),
    mk("cus_phung_loan", "so-ban-hang", "SELLER_FUNDING", 30_000_000, "APPROVED", "STP", 2600, 3),
    mk("cus_binh", "viettel-money", "PAYMENT_INSTALLMENT", 45_000_000, "MANUAL_REVIEW", "MANUAL", 0, 1),
    mk("cus_lan", "grab", "DRIVER_INSTANT_LOAN", 12_000_000, "MANUAL_REVIEW", "MANUAL", 0, 1),
    mk("cus_chi", "viettel-money", "PAYMENT_INSTALLMENT", 18_000_000, "DECLINED", "STP", 1700, 2),
  ];
  decisions[4].reasonCodes = ["NEEDS_REVIEW", "DEVICE_SHARED"];
  const manual: ManualCase[] = [
    { caseId: newId(), decisionId: decisions[4].decisionId, slaDueAt: addDays(now, 0).toISOString(), status: "OPEN", suggestedAction: "Cần xem thu nhập; thiết bị dùng chung" },
    { caseId: newId(), decisionId: decisions[5].decisionId, slaDueAt: new Date(now.getTime() + 3.6 * 3_600_000).toISOString(), status: "OPEN", suggestedAction: "Duyệt" },
    { caseId: newId(), decisionId: decisions[4].decisionId, slaDueAt: new Date(now.getTime() - 35 * 60_000).toISOString(), status: "OPEN", suggestedAction: "Duyệt (doanh số ổn định)" },
  ];
  return {
    version: VERSION, scenario: "APPROVE", emptyMode: false,
    consents: SEED_RECEIPTS(), ekyc: {}, offers: {}, decisions: Object.fromEntries(decisions.map((d) => [d.decisionId, d])), contracts: {},
    loans, manual, calls: [],
    policy: { dtiCap: 0.35, maxOpenLoans: 3, cicRefreshOnLimitChange: true, testBandShare: 0.03, championModel: "v1", rungCaps: [3, 8, 15, 30, 50].map((m) => money(m * 1_000_000)) },
    weights: { ...WEIGHTS }, audit: [],
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
