/**
 * CreditPulse mock engine. Pure functions only; handlers own persistence.
 * Policy values are illustrative (D-28): rung caps, DTI cap, stacking limit.
 */
import type { Decision, LadderRung, LimitLadder, Money, NextRung, OfferSet, Package, ProductType, ScenarioName, SourceId, SourceUse, WaterfallStep } from "@/api/types";
import { CUSTOMER_BY_REF, SOURCE_BY_ID, SOURCES, type CustomerFixture, type RungDef } from "./fixtures";
import { tKey } from "@/i18n";

export const money = (amount: number): Money => ({ amount: Math.round(amount), currency: "VND" });
export const RANGE = { min: 1_600_000, max: 90_100_000 };

/* ---------- EIR ---------- */
export function eirFor(principal: number, payment: number, months: number): number {
  if (payment * months <= principal + 1) return 0;
  let lo = 0, hi = 0.5;
  for (let i = 0; i < 80; i++) {
    const r = (lo + hi) / 2;
    let pv = 0;
    for (let k = 1; k <= months; k++) pv += payment / Math.pow(1 + r, k);
    if (pv > principal) lo = r; else hi = r;
  }
  const r = (lo + hi) / 2;
  return Math.round((Math.pow(1 + r, 12) - 1) * 1000) / 1000;
}

/* ---------- products ---------- */
interface TenorDef { months: number; markup: number; merchantPays?: boolean }
/** One product for every wallet (R-28, D-81). */
const TENORS: Record<ProductType, TenorDef[]> = {
  PAYMENT_INSTALLMENT: [{ months: 6, markup: 0, merchantPays: true }, { months: 9, markup: 0.05 }, { months: 12, markup: 0.085 }],
};

export function buildPackages(product: ProductType, amount: number, limit: number): Package[] {
  return TENORS[product].map((t) => {
    const total = Math.round((amount * (1 + t.markup)) / 1000) * 1000;
    const monthly = Math.round(total / t.months / 1000) * 1000;
    const available = amount <= limit;
    return {
      packageId: `pkg-${t.months}`,
      tenorMonths: t.months,
      monthlyInstalment: money(monthly),
      totalPayable: money(total),
      eir: eirFor(amount, total / t.months, t.months),
      interestPayer: t.merchantPays ? "MERCHANT" : "CUSTOMER",
      available,
      ...(available ? {} : { disabledReason: tKey("Vượt hạn mức hiện tại — Mở khóa thêm") }),
    } as Package;
  });
}

/* ---------- ladder ---------- */
export interface Ctx {
  customer: CustomerFixture;
  connected: Set<SourceId>;
  scenario: ScenarioName;
  /** Sources that were granted but have too little history (THIN_FILE scenario). */
  insufficient: Set<SourceId>;
}

const BASELINE: SourceId[] = ["B-01", "AD-02"];
const usable = (ctx: Ctx, s: SourceId) => BASELINE.includes(s) || (ctx.connected.has(s) && !ctx.insufficient.has(s));

export function rungReached(ctx: Ctx): RungDef {
  const defs = ctx.customer.rungs;
  let reached = defs[0];
  for (const d of defs) {
    const ok = d.sources.every((s) => usable(ctx, s));
    if (ok) reached = d;
    else break;
  }
  return reached;
}

const VARIABLES: Partial<Record<SourceId, string[]>> = {
  "B-01": [tKey("CCCD gắn chip hợp lệ"), tKey("Khớp khuôn mặt")],
  "B-02": [tKey("Số khoản vay hiện có"), tKey("Lịch sử nợ quá hạn")],
  "AD-01": [tKey("Số tháng dùng ví"), tKey("Nạp/rút đều đặn"), tKey("Dòng tiền trung bình")],
  "AD-02": [tKey("Thiết bị nhất quán"), tKey("Số người dùng chung thiết bị")],
  "AD-03": [tKey("Lương về đều hằng tháng"), tKey("Số tháng nhận lương")],
  "AD-04": [tKey("Nhịp nạp tiền"), tKey("Thời gian dùng ví")],
  "AD-05": [tKey("Hóa đơn điện nước đã trả"), tKey("Tỷ lệ trả đúng hạn")],
  "AD-06": [tKey("Dòng tiền ngân hàng khác")],
  "AD-07": [tKey("Thu nhập theo kỳ"), tKey("Số ngày hoạt động"), tKey("Thời gian làm đối tác")],
  "AD-08": [tKey("Doanh số theo ngày"), tKey("Số đơn"), tKey("Tỷ lệ hoàn trả"), tKey("Tiền hàng về")],
  "AD-09": [tKey("Trả nợ đúng hạn tại HLB")],
  "AD-10": [tKey("Độ ổn định số điện thoại")],
};
const sourceUse = (id: SourceId, connected: boolean, role?: string): SourceUse => {
  const d = SOURCE_BY_ID[id];
  return { sourceId: id, name: d.name, rank: d.rank, outputs: d.outputs, connected, role: role ?? d.role, weightScore: score(id), variablesRead: VARIABLES[id] ?? [], costVnd: d.costVnd, latencyMs: d.latencyMs };
};

export function score(id: SourceId, w = { predictive: 0.3, coverage: 0.25, cost: 0.15, access: 0.15, legal: 0.15 }): number {
  const r = SOURCE_BY_ID[id].ratings;
  return Math.round((w.predictive * r.predictive + w.coverage * r.coverage + w.cost * r.cost + w.access * r.access + w.legal * r.legal) * 100) / 100;
}

export function currentLimit(ctx: Ctx): number {
  const base = rungReached(ctx).cap;
  const pre = ctx.customer.prescreenLimit;
  const lim = pre && ctx.connected.size >= 0 ? Math.max(base, pre) : base;
  if (ctx.scenario === "THIN_FILE") return Math.min(lim, ctx.customer.rungs[0].cap);
  return lim;
}

export function nextSuggestion(ctx: Ctx): NextRung | undefined {
  const defs = ctx.customer.rungs;
  const cur = rungReached(ctx);
  const next = defs.find((d) => d.rung > cur.rung);
  if (!next) return undefined;
  // A source that is connected but still too thin (new driver or shop) is not suggested again; its rung says when to come back.
  const cands = next.sources.filter((s) => !BASELINE.includes(s) && !usable(ctx, s) && !(ctx.connected.has(s) && ctx.insufficient.has(s)));
  if (!cands.length) return undefined;
  cands.sort((a, b) => SOURCE_BY_ID[a].rank - SOURCE_BY_ID[b].rank || a.localeCompare(b));
  const s = cands[0];
  return { sourceId: s, name: SOURCE_BY_ID[s].name, rank: SOURCE_BY_ID[s].rank, unlockLimit: money(next.cap) };
}

export function ladderFor(ctx: Ctx): LimitLadder {
  const cur = rungReached(ctx);
  const rungs: LadderRung[] = ctx.customer.rungs.map((d) => ({
    rung: d.rung,
    cap: money(d.cap),
    reached: d.rung <= cur.rung,
    unlocksText: d.text,
    sources: d.sources.map((s) =>
      sourceUse(s, usable(ctx, s), ctx.insufficient.has(s) ? tKey("Chưa đủ dữ liệu — quay lại sau 45 ngày") : undefined),
    ),
  }));
  return {
    customerRef: ctx.customer.ref,
    segment: ctx.customer.segment,
    currentRung: cur.rung,
    currentLimit: money(currentLimit(ctx)),
    rungs,
    nextSuggestion: nextSuggestion(ctx),
    cicState: ctx.customer.cic === "FILE_FOUND" && ctx.connected.has("B-02") ? "FILE_FOUND" : ctx.customer.cic === "NO_FILE" ? "NO_FILE" : "NOT_QUERIED",
  };
}

export function affordability(ctx: Ctx): number {
  let af = ctx.customer.afBase;
  for (const s of ctx.connected) if (!ctx.insufficient.has(s)) af += ctx.customer.afBySource[s] ?? 0;
  return af;
}

/* ---------- offers ---------- */
export function offerSetFor(ctx: Ctx, product: ProductType, amount: number, id: string): OfferSet {
  const limit = currentLimit(ctx);
  const next = nextSuggestion(ctx);
  return {
    offerRequestId: id,
    limit: money(limit),
    rung: rungReached(ctx).rung,
    packages: buildPackages(product, amount, limit),
    reasonCodes: amount > limit ? ["LIMIT_SHORT"] : [],
    nextRung: next,
    explanationText: amount > limit ? tKey("Đơn hàng vượt hạn mức hiện tại. Kết nối thêm dữ liệu để tăng hạn mức.") : undefined,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    lockup: tKey("Được cung cấp bởi Hong Leong Bank"),
  };
}

/* ---------- assessment ---------- */
const ORDER: SourceId[] = ["AD-02", "AD-03", "AD-01", "AD-10", "AD-04", "AD-05", "AD-07", "AD-08", "AD-06", "B-02"];

export interface AssessInput {
  ctx: Ctx;
  amount: number;
  product: ProductType;
  packageId?: string;
  openLoans: number;
  maxOpenLoans: number;
  dtiCap: number;
}

export function assess(i: AssessInput): Omit<Decision, "decisionId" | "decidedAt"> {
  let { ctx } = i;
  // SOURCE_DOWN: the highest-priority connected source is unreachable; the waterfall continues without it (AC-16.4).
  const down = ctx.scenario === "SOURCE_DOWN" ? ORDER.find((id) => id !== "AD-02" && ctx.connected.has(id)) : undefined;
  if (down) ctx = { ...ctx, insufficient: new Set([...ctx.insufficient, down]) };
  const limit = currentLimit(ctx);
  // Capacity scales with the operator's DTI cap; the demo baseline of 35% (D-28) leaves it unchanged.
  const af = Math.round(affordability(ctx) * (i.dtiCap / 0.35));
  const tenor = Number((i.packageId ?? "pkg-6").split("-")[1]);
  const pkg = buildPackages(i.product, i.amount, limit).find((p) => p.tenorMonths === tenor) ?? buildPackages(i.product, i.amount, limit)[0];
  const monthly = pkg.monthlyInstalment.amount;

  // Waterfall: cheapest and highest-ranked first; stop once the amount is covered with confidence.
  const waterfall: WaterfallStep[] = [];
  let order = 0, stopped = false, latency = 80;
  for (const id of ORDER) {
    const def = SOURCE_BY_ID[id];
    const isUsed = id === "AD-02" || (ctx.connected.has(id) && !ctx.insufficient.has(id));
    order += 1;
    if (id === down) { waterfall.push({ order, sourceId: id, status: "UNAVAILABLE", stopReason: tKey("nguồn tạm thời không có") }); continue; }
    if (stopped || !isUsed) {
      waterfall.push({ order, sourceId: id, status: "SKIPPED", stopReason: stopped ? tKey("Bỏ qua (đã đủ tự tin)") : tKey("Bỏ qua (chưa cần)") });
      continue;
    }
    latency += def.latencyMs;
    const rest = ORDER.slice(ORDER.indexOf(id) + 1).filter((s) => ctx.connected.has(s) && !ctx.insufficient.has(s));
    const confident = limit >= i.amount && rest.length === 0;
    waterfall.push({ order, sourceId: id, status: "QUERIED", costVnd: def.costVnd, latencyMs: def.latencyMs, ...(confident ? { stopReason: tKey("Đủ tự tin") } : {}) });
    if (confident) stopped = true;
  }
  const dataUsed: SourceUse[] = [...ctx.connected]
    .filter((s) => !ctx.insufficient.has(s))
    .sort((a, b) => SOURCE_BY_ID[a].rank - SOURCE_BY_ID[b].rank)
    .map((s) => sourceUse(s, true));
  const ratings = { riskGrade: ctx.customer.riskGrade, affordability: money(af), integrity: (ctx.scenario === "COUNTER_OFFER" ? "REVIEW" : "PASS") as "PASS" | "REVIEW", limit: money(limit) };
  // The engine always decides within the 10 s cap (R-25, D-77, D-79): approve, counter-offer or decline. Never "pending review".
  const base = { waterfall, dataUsed, ratings, latencyMs: Math.min(latency, 9_500), nextRung: nextSuggestion(ctx), requestedAmount: money(i.amount) };
  const retryAfter = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const appeal = { appealable: true, appealDeadline: retryAfter };
  const floor100k = (n: number) => Math.floor(n / 100_000) * 100_000;
  const minAmount = RANGE.min;
  const counter = (amount: number, codes: string[], text: string) => ({ ...base, ...appeal, outcome: "COUNTER_OFFER" as const, approvedAmount: money(amount), tenorMonths: tenor, reasonCodes: codes, explanationText: text, retryAfter });

  if (i.openLoans >= i.maxOpenLoans) {
    return { ...base, ...appeal, outcome: "DECLINED", reasonCodes: ["STACKING_LIMIT"], explanationText: tKey("Bạn đang có {0} khoản trả góp. Hoàn tất một khoản để vay thêm.", i.openLoans), retryAfter };
  }
  if (ctx.scenario === "NOT_APPROVED") {
    return { ...base, ...appeal, outcome: "DECLINED", reasonCodes: ["INCOME_LOW"], explanationText: tKey("Thu nhập ước tính chưa đủ so với khoản trả hằng tháng."), retryAfter };
  }
  if (ctx.scenario === "COUNTER_OFFER") {
    // Fraud signal: the device was used by several applicants in 24 h; the engine caps the amount instead of referring (AC-11.2).
    const capped = Math.max(minAmount, floor100k(Math.min(limit, i.amount) * 0.6));
    return counter(capped, ["DEVICE_SHARED"], tKey("Thiết bị này được nhiều người dùng để đăng ký vay, nên số tiền được duyệt thấp hơn đề nghị."));
  }
  if (i.amount > limit) {
    if (limit >= minAmount) return counter(limit, ["LIMIT_EXCEEDED"], tKey("Số tiền đề nghị vượt hạn mức hiện tại. HLB duyệt trong hạn mức của bạn."));
    return { ...base, ...appeal, outcome: "DECLINED", reasonCodes: ["LIMIT_EXCEEDED"], explanationText: tKey("Số tiền vượt hạn mức hiện tại. Bạn có thể chọn gói nhỏ hơn hoặc kết nối thêm dữ liệu."), retryAfter };
  }
  if (af > 0 && monthly > af) {
    const fit = floor100k((i.amount * af) / monthly);
    if (fit >= minAmount) return counter(fit, ["AFFORDABILITY"], tKey("Khoản trả hằng tháng vượt khả năng chi trả ước tính. HLB duyệt số tiền phù hợp với thu nhập của bạn."));
    return { ...base, ...appeal, outcome: "DECLINED", reasonCodes: ["AFFORDABILITY"], explanationText: tKey("Khoản trả hằng tháng vượt khả năng chi trả ước tính (mức trần DTI)."), retryAfter };
  }
  const why: Record<string, string> = {
    "AD-01": tKey("Ví của bạn có thu nhập đều đặn 12 tháng"),
    "AD-05": tKey("Hóa đơn điện nước trả đúng hạn"),
    "AD-03": tKey("Lương về tài khoản HLB đều hằng tháng"),
    "AD-07": tKey("Thu nhập trên Grab đều đặn 10 tháng"),
    "AD-08": tKey("Doanh số 6 tháng ổn định, tỷ lệ hoàn trả thấp"),
    "AD-04": tKey("Bạn nạp tiền vào ví đều đặn"),
    "B-02": tKey("Hồ sơ CIC không có nợ xấu"),
  };
  const reasons = dataUsed.map((d) => why[d.sourceId]).filter(Boolean);
  // Catalogue phrases are sentence-case; the second one continues the sentence in lower case.
  const text = reasons[1] ? tKey("{0}; {1}.", reasons[0], reasons[1].charAt(0).toLowerCase() + reasons[1].slice(1)) : reasons[0] ? tKey("{0}.", reasons[0]) : tKey("Hồ sơ đáp ứng điều kiện trong hạn mức hiện tại.");
  return {
    ...base,
    outcome: "APPROVED",
    approvedAmount: money(i.amount),
    tenorMonths: tenor,
    reasonCodes: dataUsed.map((d) => `${d.sourceId}_OK`),
    explanationText: text,
    appealable: false,
  };
}

export const SOURCE_LIST = SOURCES;
export const customerOf = (ref: string) => CUSTOMER_BY_REF[ref];
