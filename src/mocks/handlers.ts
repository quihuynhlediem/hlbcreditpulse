import { http, HttpResponse, delay, type HttpHandler } from "msw";
import type { ApiCall, Appeal, AppealSummary, ConsentReceipt, Decision, DecisionSummary, Instalment, ProductType, SourceId } from "@/api/types";
import { trDeep, type Locale, tKey } from "@/i18n";
import { CUSTOMER_BY_REF, SOURCES, SOURCE_BY_ID } from "./fixtures";
import { addDays, getDb, makeSchedule, newId, resetDemoData, saveDb, type StoredDecision } from "./db";
import { RANGE, assess, buildPackages, currentLimit, eirFor, ladderFor, money, offerSetFor, score, type Ctx } from "./engine";

type Json = Record<string, unknown>;

function problem(status: number, title: string, type: string, detail?: string, errors?: { field: string; message: string }[]) {
  return HttpResponse.json({ type: `https://creditpulse.example/problems/${type}`, title, status, detail, errors }, { status, headers: { "content-type": "application/problem+json" } });
}

function ctxFor(ref: string): Ctx | null {
  const customer = CUSTOMER_BY_REF[ref];
  if (!customer) return null;
  const db = getDb();
  const connected = new Set<SourceId>(db.consents.filter((c) => c.customerRef === ref && c.status === "GRANTED").map((c) => c.sourceId));
  const insufficient = new Set<SourceId>();
  if (db.scenario === "THIN_FILE") for (const s of ["AD-01", "AD-05", "AD-04"] as SourceId[]) if (connected.has(s)) insufficient.add(s);
  // A new driver's earnings or a new seller's sales do not have enough history yet (AC-12.4, AC-23.2, AC-26.2).
  for (const s of customer.thinSources ?? []) if (connected.has(s)) insufficient.add(s);
  return { customer, connected, scenario: db.scenario, insufficient };
}
const openLoans = (ref: string) => getDb().loans.filter((l) => l.customerRef === ref && l.status !== "SETTLED").length;

/** Registers an operation: logs it for the API inspector, applies error and slow scenarios. */
function op(method: "get" | "post" | "put" | "delete", path: string, operationId: string, fn: (a: { req: Request; params: Record<string, string>; body: Json }) => Promise<Response> | Response, o: { log?: boolean; baseDelay?: number } = {}): HttpHandler {
  return http[method](`*${path}`, async ({ request, params }) => {
    const db = getDb();
    const started = performance.now();
    const body = method === "get" ? {} : ((await request.clone().json().catch(() => ({}))) as Json);
    const flow = request.headers.get("x-demo-flow") ?? "";
    const screen = request.headers.get("x-demo-screen") ?? "";
    let res: Response;
    const base = o.baseDelay ?? 250;
    await delay(base);
    if (db.errorOp === operationId) {
      res = problem(500, tKey("Dịch vụ tạm thời gián đoạn"), "internal", tKey("Vui lòng thử lại sau."));
    } else {
      res = await fn({ req: request, params: params as Record<string, string>, body });
    }
    // Content (copy, reason texts, problem titles) is served in the requested language (AC-17.4, D-70, D-80).
    const lang: Locale = (request.headers.get("accept-language") ?? "en").startsWith("vi") ? "vi" : "en";
    if (lang === "en" && (res.headers.get("content-type") ?? "").includes("json")) {
      const payload = await res.clone().json().catch(() => undefined);
      if (payload !== undefined) res = new Response(JSON.stringify(trDeep(payload, lang)), { status: res.status, headers: res.headers });
    }
    if (o.log !== false) {
      let resBody: unknown = {};
      try { resBody = await res.clone().json(); } catch { /* empty body */ }
      const call: ApiCall = {
        callId: newId(), flow, method: method.toUpperCase(), path: new URL(request.url).pathname, status: res.status, latencyMs: Math.round(performance.now() - started),
        idempotencyKey: request.headers.get("idempotency-key") ?? `idem_${Math.random().toString(36).slice(2, 10)}`, request: body, response: resBody as Json, screen, at: new Date().toISOString(),
      };
      db.calls = [call, ...db.calls].slice(0, 200);
    }
    saveDb();
    return res;
  });
}

const webhookLog = (name: string, partner: string, detail: Json) => {
  const db = getDb();
  const call: ApiCall = { callId: newId(), flow: "", method: "WEBHOOK", path: name, status: 200, latencyMs: 40, idempotencyKey: `wh_${Math.random().toString(36).slice(2, 8)}`, request: { partner, ...detail }, response: {}, screen: "", at: new Date().toISOString() };
  db.calls = [call, ...db.calls].slice(0, 200);
};

const ok = (data: unknown, status = 200) => HttpResponse.json(data as Json, { status });

/** Demo-only: the acting staff role travels in a header so the mock can enforce maker ≠ checker (AC-60.2). */
const actorOf = (req: Request) => req.headers.get("x-demo-actor") ?? "operator.demo@hlb";
function newApproval(kind: string, targetId: string, diff: unknown, reason: string, makerId: string) {
  const db = getDb();
  const a = { approvalId: newId(), kind, targetId, diff: diff as Json, reason, makerId, status: "PENDING", expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(), comment: "" };
  db.approvals = [a, ...(db.approvals ?? [])];
  return a;
}


/* ---------- appeals (R-25, D-78): human reassessment only when the customer asks ---------- */
const REVIEWER_AUTHORITY = 20_000_000;
/** Two working days from `from`, skipping Saturday and Sunday. */
function twoWorkingDays(from: Date) { const d = new Date(from); let n = 0; while (n < 2) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n += 1; } return d; }
function slaOf(a: { status: string; createdAt: string; dueAt: string }, now = Date.now()) {
  if (a.status === "UPHELD" || a.status === "OVERTURNED" || a.status === "INFO_REQUESTED") return "GREEN" as const;
  const due = new Date(a.dueAt).getTime(), start = new Date(a.createdAt).getTime();
  if (now > due) return "RED" as const;
  return (due - now) / Math.max(1, due - start) <= 0.25 ? ("AMBER" as const) : ("GREEN" as const);
}
const summaryOf = (a: Appeal): AppealSummary => ({ appealId: a.appealId, referenceNo: a.referenceNo, status: a.status, dueAt: a.dueAt, newOffer: a.newOffer, offerValidUntil: a.offerValidUntil });
const appealFor = (decisionId: string) => getDb().appeals.find((a) => a.decisionId === decisionId);
/** The decision as served: the stored AI outcome plus the appeal summary and whether it can still be appealed. */
function decisionView(d: StoredDecision) {
  const a = appealFor(d.decisionId);
  const open = d.outcome !== "APPROVED" && !a && (!d.appealDeadline || new Date(d.appealDeadline).getTime() > Date.now());
  return { ...d, appealable: open, ...(a ? { appeal: summaryOf(a) } : {}) };
}
/** Amount the customer may sign for: the AI amount, or the reviewer's new offer after an overturn. */
function effectiveAmount(d: StoredDecision): number | undefined {
  const a = appealFor(d.decisionId);
  if (a?.status === "OVERTURNED" && a.newOffer) return a.newOffer.amount;
  if (d.outcome === "APPROVED" || d.outcome === "COUNTER_OFFER") return d.approvedAmount?.amount;
  return undefined;
}
function applyAppealOutcome(a: Appeal, outcome: "UPHELD" | "OVERTURNED", reasonCode: string, by: string, newOffer?: number) {
  a.status = outcome; a.outcome = outcome; a.outcomeReasonCode = reasonCode; a.decidedBy = by; a.decidedAt = new Date().toISOString();
  if (outcome === "OVERTURNED" && newOffer) { a.newOffer = money(newOffer); a.offerValidUntil = addDays(new Date(), 7).toISOString(); }
  const d = getDb().decisions[a.decisionId];
  webhookLog("decision.updated", String(d?.partnerId ?? ""), { decisionId: a.decisionId, appeal: outcome });
  getDb().audit.unshift({ at: new Date().toISOString(), actor: by, action: "appeal.decide", detail: `${a.referenceNo}: ${outcome} ${reasonCode}${newOffer ? ` · ${newOffer}` : ""}` });
}

export const handlers: HttpHandler[] = [
  op("post", "/api/v1/prescreens", "createPrescreen", ({ body }) => {
    const ref = String(body.hashedCustomerId ?? "").replace(/^h_/, "");
    const ctx = ctxFor(ref);
    if (!ctx || !ctx.customer.prescreenLimit) return ok({ eligible: false });
    const lim = ctx.customer.prescreenLimit;
    return ok({ eligible: true, bandMin: money(lim / 2), bandMax: money(lim), rung: ctx.customer.rungs.at(-1)?.rung ?? 1, validUntil: addDays(new Date(), 7).toISOString() });
  }, { baseDelay: 150 }),

  op("post", "/api/v1/offers", "createOfferRequest", async ({ body }) => {
    const ref = String(body.customerRef);
    const ctx = ctxFor(ref);
    if (!ctx) return problem(404, tKey("Không tìm thấy khách hàng"), "customer-not-found");
    const amount = Number((body.amount as { amount: number }).amount);
    const product = body.productType as ProductType;
    if (amount < RANGE.min || amount > RANGE.max) return problem(422, tKey("Giá trị đơn hàng ngoài phạm vi trả góp"), "order-out-of-range");
    if (getDb().scenario === "SLOW") await delay(3500);
    const id = newId();
    getDb().offers[id] = { offerRequestId: id, customerRef: ref, partnerId: String(body.partnerId), productType: product, amount, orderRef: body.orderRef as string | undefined, createdAt: new Date().toISOString() };
    return ok(offerSetFor(ctx, product, amount, id), 201);
  }, { baseDelay: 650 }),

  op("get", "/api/v1/offers/:offerRequestId", "getOfferSet", ({ params }) => {
    const o = getDb().offers[params.offerRequestId];
    if (!o) return problem(404, tKey("Không tìm thấy gói trả góp"), "offer-not-found");
    return ok(offerSetFor(ctxFor(o.customerRef)!, o.productType, o.amount, o.offerRequestId));
  }, { log: false, baseDelay: 120 }),

  op("post", "/api/v1/consents", "createConsent", ({ body }) => {
    const db = getDb();
    const ref = String(body.customerRef), src = body.sourceId as SourceId;
    const existing = db.consents.find((c) => c.customerRef === ref && c.sourceId === src && c.status === "GRANTED");
    if (existing) return ok(existing, 201);
    const customer = CUSTOMER_BY_REF[ref];
    if (!customer) return problem(404, tKey("Không tìm thấy khách hàng"), "customer-not-found");
    const r: ConsentReceipt = { receiptId: newId(), customerRef: ref, partnerId: customer.partnerId, sourceId: src, purpose: String(body.purpose ?? tKey("Đánh giá khả năng trả nợ")), status: "GRANTED", grantedAt: new Date().toISOString() };
    const before = currentLimit(ctxFor(ref)!);
    db.consents = [r, ...db.consents];
    const after = currentLimit(ctxFor(ref)!);
    if (after !== before && db.policy.cicRefreshOnLimitChange) db.audit.unshift({ at: new Date().toISOString(), actor: "system", action: "cic.refresh", detail: tKey("{0}: hạn mức {1} → {2}; hồ sơ CIC đã tra và lưu", ref, before, after) });
    return ok(r, 201);
  }, { baseDelay: 150 }),

  op("get", "/api/v1/customers/:customerRef/consents", "listConsents", ({ params }) => ok(getDb().consents.filter((c) => c.customerRef === params.customerRef)), { log: false, baseDelay: 100 }),

  op("post", "/api/v1/consents/:receiptId/withdraw", "withdrawConsent", ({ params }) => {
    const c = getDb().consents.find((x) => x.receiptId === params.receiptId);
    if (!c) return problem(404, tKey("Không tìm thấy mã đồng ý"), "consent-not-found");
    c.status = "WITHDRAWN"; c.withdrawnAt = new Date().toISOString();
    return ok(c);
  }, { baseDelay: 150 }),

  op("post", "/api/v1/ekyc/verifications", "createEkycVerification", ({ body }) => {
    const db = getDb();
    const ref = String(body.customerRef);
    const rec = db.ekyc[ref] ?? { status: "RETRY" as const, attempts: 0, verificationId: newId() };
    rec.attempts += 1;
    if (db.scenario === "EKYC_FAIL") {
      rec.status = "RETRY";
      db.ekyc[ref] = rec;
      return ok({ verificationId: rec.verificationId, status: "RETRY", reasonCode: body.method === "NFC_CHIP" ? "CHIP_UNREADABLE" : "FACE_MISMATCH" }, 201);
    }
    rec.status = "PASSED";
    db.ekyc[ref] = rec;
    return ok({ verificationId: rec.verificationId, status: "PASSED", reusableUntil: new Date(Date.now() + 3_600_000).toISOString() }, 201);
  }, { baseDelay: 500 }),

  op("get", "/api/v1/customers/:customerRef/limit-ladder", "getLimitLadder", ({ params }) => {
    const ctx = ctxFor(params.customerRef);
    if (!ctx) return problem(404, tKey("Không tìm thấy khách hàng"), "customer-not-found");
    return ok(ladderFor(ctx));
  }, { log: false, baseDelay: 150 }),

  op("post", "/api/v1/assessments", "createAssessment", ({ body }) => {
    const db = getDb();
    const ref = String(body.customerRef);
    const ctx = ctxFor(ref);
    if (!ctx) return problem(404, tKey("Không tìm thấy khách hàng"), "customer-not-found");
    const product = body.productType as ProductType;
    const ek = db.ekyc[ref];
    if (!(ctx.customer.ekycDone || ek?.status === "PASSED")) return problem(422, tKey("Cần xác thực danh tính trước khi xét duyệt"), "ekyc-required");
    const amount = Number((body.amount as { amount: number }).amount);
    const out = assess({ ctx, amount, product, packageId: body.packageId as string | undefined, openLoans: openLoans(ref), maxOpenLoans: db.policy.maxOpenLoans, dtiCap: db.policy.dtiCap });
    const d: StoredDecision = { ...(out as Decision), decisionId: newId(), decidedAt: new Date().toISOString(), customerRef: ref, partnerId: ctx.customer.partnerId, productType: product, amount, packageId: body.packageId as string | undefined };
    db.decisions[d.decisionId] = d;
    return ok(decisionView(d), 201);
  }, { baseDelay: 900 }),

  op("get", "/api/v1/decisions/:decisionId", "getDecision", ({ params }) => {
    const d = getDb().decisions[params.decisionId];
    return d ? ok(decisionView(d)) : problem(404, tKey("Không tìm thấy quyết định"), "decision-not-found");
  }, { log: false, baseDelay: 100 }),

  op("post", "/api/v1/decisions/:decisionId/appeals", "createAppeal", ({ params, body }) => {
    const db = getDb();
    const d = db.decisions[params.decisionId];
    if (!d) return problem(404, tKey("Không tìm thấy quyết định"), "decision-not-found");
    if (appealFor(d.decisionId)) return problem(409, tKey("Quyết định này đã được xem xét lại."), "appeal-exists");
    if (!decisionView(d).appealable) return problem(422, tKey("Quyết định này không thể yêu cầu xem xét lại."), "appeal-not-allowed");
    const now = new Date();
    const a: Appeal & { customerRef: string } = {
      appealId: newId(), referenceNo: `HLB-XL-2026-${String(130 + db.appeals.length).padStart(6, "0")}`, decisionId: d.decisionId, customerRef: d.customerRef, customerMask: `cus_…${d.customerRef.replace("cus_", "").slice(0, 6)}`,
      partnerId: d.partnerId as never, productType: d.productType, aiOutcome: d.outcome, requestedAmount: money(d.amount), aiAmount: d.approvedAmount, reasonCodes: d.reasonCodes,
      note: String(body.note ?? ""), channel: "PARTNER_APP", status: "OPEN", createdAt: now.toISOString(), dueAt: twoWorkingDays(now).toISOString(), slaState: "GREEN",
    };
    db.appeals = [a, ...db.appeals];
    webhookLog("notice.requested", d.partnerId, { notice: "N-16", referenceNo: a.referenceNo });
    return ok({ ...summaryOf(a), message: tKey("Đã gửi yêu cầu xem xét lại. Chuyên viên HLB sẽ trả lời trong vòng 2 ngày làm việc.") }, 201);
  }, { baseDelay: 350 }),

  op("get", "/api/v1/appeals/:appealId", "getAppeal", ({ params }) => {
    const a = getDb().appeals.find((x) => x.appealId === params.appealId);
    return a ? ok(summaryOf(a)) : problem(404, tKey("Không tìm thấy yêu cầu"), "appeal-not-found");
  }, { log: false, baseDelay: 100 }),

  op("post", "/api/v1/contracts", "createContract", ({ body }) => {
    const db = getDb();
    const d = db.decisions[String(body.decisionId)];
    const principal = d ? effectiveAmount(d) : undefined;
    if (!d || !principal) return problem(422, tKey("Chỉ tạo hợp đồng cho khoản đã được duyệt"), "decision-not-approved");
    const pkgs = buildPackages(d.productType, principal, Number.MAX_SAFE_INTEGER);
    const p = pkgs.find((x) => x.packageId === body.packageId) ?? pkgs[0];
    const schedule = makeSchedule({ months: p.tenorMonths, total: p.totalPayable.amount, paid: 0 });
    const id = newId();
    const eir = eirFor(principal, p.totalPayable.amount / p.tenorMonths, p.tenorMonths);
    const c = { contractId: id, lender: "Hong Leong Bank Vietnam", amount: money(principal), tenorMonths: p.tenorMonths, totalPayable: p.totalPayable, eir, schedule, keyFacts: [tKey("Không có phí ẩn")], status: "DRAFT" as const, decisionId: d.decisionId, customerRef: d.customerRef, partnerId: d.partnerId, productType: d.productType, principal, packageId: p.packageId };
    db.contracts[id] = c;
    return ok(c, 201);
  }, { baseDelay: 300 }),

  op("post", "/api/v1/contracts/:contractId/sign", "signContract", ({ params, body }) => {
    const db = getDb();
    const c = db.contracts[params.contractId];
    if (!c) return problem(404, tKey("Không tìm thấy hợp đồng"), "contract-not-found");
    if (db.scenario === "SESSION_EXPIRED") { db.scenario = "APPROVE"; c.status = "EXPIRED"; return problem(410, tKey("Phiên đã hết hạn"), "session-expired"); }
    if (String(body.otp) !== "123456") return problem(422, tKey("Mã OTP chưa đúng"), "otp-invalid");
    c.status = "SIGNED";
    const offer = Object.values(db.offers).find((o) => o.customerRef === c.customerRef && o.amount === c.principal);
    const loan = { loanId: newId(), customerRef: c.customerRef, partnerId: c.partnerId as never, productType: c.productType, status: "ACTIVE" as const, principalRemaining: money(c.principal), totalRemaining: money(c.totalPayable.amount), eir: c.eir, schedule: c.schedule, principal: c.principal, orderRef: offer?.orderRef };
    db.loans = [loan, ...db.loans];
    webhookLog("loan.booked", c.partnerId, { loanId: loan.loanId, amount: c.principal });
    webhookLog("disbursement.to_partner_settlement_account", c.partnerId, { loanId: loan.loanId });
    return ok(loan);
  }, { baseDelay: 400 }),

  op("get", "/api/v1/customers/:customerRef/loans", "listLoans", ({ params }) => ok(getDb().emptyMode ? [] : getDb().loans.filter((l) => l.customerRef === params.customerRef)), { log: false, baseDelay: 150 }),

  op("post", "/api/v1/loans/:loanId/payments", "createPayment", ({ params, body }) => {
    const db = getDb();
    const l = db.loans.find((x) => x.loanId === params.loanId);
    if (!l) return problem(404, tKey("Không tìm thấy khoản vay"), "loan-not-found");
    let left = Number((body.amount as { amount: number }).amount);
    let paidSum = 0;
    for (const s of l.schedule) {
      if (left <= 0) break;
      if (s.status === "DUE" || s.status === "LATE" || s.status === "PAUSED") {
        if (s.amount.amount === 0) { s.status = "PAID"; continue; }
        if (left + 1 >= s.amount.amount) { s.status = "PAID"; left -= s.amount.amount; paidSum += s.amount.amount; } else break;
      }
    }
    const rest = l.schedule.filter((s) => s.status !== "PAID").reduce((a, s) => a + s.amount.amount, 0);
    const ratio = l.totalRemaining.amount ? rest / l.totalRemaining.amount : 0;
    l.principalRemaining = money(l.principalRemaining.amount * ratio);
    l.totalRemaining = money(rest);
    if (rest === 0) l.status = "SETTLED";
    webhookLog("repayment.posted", String(l.partnerId ?? ""), { loanId: l.loanId, amount: paidSum });
    return ok(l, 201);
  }, { baseDelay: 350 }),

  op("get", "/api/v1/loans/:loanId/settlement-quote", "getSettlementQuote", ({ params }) => {
    const l = getDb().loans.find((x) => x.loanId === params.loanId);
    if (!l) return problem(404, tKey("Không tìm thấy khoản vay"), "loan-not-found");
    const interestLeft = Math.max(0, l.totalRemaining.amount - l.principalRemaining.amount);
    return ok({ loanId: l.loanId, payoff: l.principalRemaining, interestSaved: money(interestLeft), validUntil: addDays(new Date(), 1).toISOString() });
  }, { baseDelay: 200 }),

  op("post", "/api/v1/webhooks/refunds", "receiveRefundEvent", ({ body }) => {
    const l = getDb().loans.find((x) => x.loanId === body.loanId);
    if (!l) return problem(404, tKey("Không tìm thấy khoản vay"), "loan-not-found");
    const refund = Number((body.refundAmount as { amount: number }).amount);
    if (body.reason === "RETURN_REJECTED") {
      webhookLog("refund.rejected", String(l.partnerId ?? ""), { loanId: l.loanId, refund });
      const nextDueItem = l.schedule.find((s) => s.status === "DUE" || s.status === "LATE" || s.status === "PAUSED");
      return ok({ loanId: l.loanId, newPrincipal: l.principalRemaining, newSchedule: l.schedule.filter((s) => s.status !== "PAID"), pauseUntil: nextDueItem?.dueDate ?? new Date().toISOString().slice(0, 10), adverseCicReported: false });
    }
    const newPrincipal = Math.max(0, l.principalRemaining.amount - refund);
    const ratio = l.principalRemaining.amount ? newPrincipal / l.principalRemaining.amount : 0;
    const pause = addDays(new Date(), 30);
    let first = true;
    for (const s of l.schedule) {
      if (s.status === "DUE" || s.status === "LATE") {
        s.amount = money(Math.round((s.amount.amount * ratio) / 1000) * 1000);
        if (first) { s.status = "PAUSED"; s.dueDate = pause.toISOString().slice(0, 10); first = false; }
      }
    }
    const rest = l.schedule.filter((s) => s.status !== "PAID").reduce((a, s) => a + s.amount.amount, 0);
    l.principalRemaining = money(newPrincipal);
    l.totalRemaining = money(rest);
    l.status = "PAUSED";
    l.pauseUntil = pause.toISOString().slice(0, 10);
    webhookLog("refund.applied", String(l.partnerId ?? ""), { loanId: l.loanId, refund });
    return ok({ loanId: l.loanId, newPrincipal: money(newPrincipal), newSchedule: l.schedule.filter((s) => s.status !== "PAID"), pauseUntil: l.pauseUntil, adverseCicReported: false });
  }, { baseDelay: 300 }),

  op("get", "/api/v1/customers/:customerRef/graduation-offer", "getGraduationOffer", ({ params }) => {
    const db = getDb();
    const ctx = ctxFor(params.customerRef);
    const paid = db.loans.filter((l) => l.customerRef === params.customerRef).flatMap((l) => l.schedule).filter((s: Instalment) => s.status === "PAID").length;
    const late = db.loans.some((l) => l.customerRef === params.customerRef && l.schedule.some((x: Instalment) => x.status === "LATE"));
    if (!ctx || paid < 3 || late) return ok({ customerRef: params.customerRef, newLimit: money(0), productOffers: [] });
    const cur = currentLimit(ctx);
    return ok({ customerRef: params.customerRef, newLimit: money(Math.ceil((cur * 1.34) / 1_000_000) * 1_000_000), productOffers: ["HLB_CARD"], merchantCode: "SHOP-10" });
  }, { log: false, baseDelay: 150 }),

  /* ---------- console ---------- */
  op("get", "/api/v1/console/decisions", "listDecisions", ({ req }) => {
    const u = new URL(req.url);
    const partner = u.searchParams.get("partnerId"), outcome = u.searchParams.get("outcome");
    const page = Number(u.searchParams.get("page") ?? 0), size = Number(u.searchParams.get("size") ?? 50);
    const all = Object.values(getDb().decisions).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt)).filter((d) => (!partner || d.partnerId === partner) && (!outcome || d.outcome === outcome));
    const items: DecisionSummary[] = (getDb().emptyMode ? [] : all).slice(page * size, page * size + size).map((d) => ({
      decisionId: d.decisionId, customerMask: `cus_…${d.customerRef.replace("cus_", "").slice(0, 6)}`, partnerId: d.partnerId as never, productType: d.productType, amount: money(d.amount), outcome: d.outcome, appealStatus: appealFor(d.decisionId)?.status ?? "NONE", latencyMs: d.latencyMs, decidedAt: d.decidedAt,
    }));
    return ok({ items, page, size, totalItems: getDb().emptyMode ? 0 : all.length });
  }, { log: false, baseDelay: 150 }),

  op("get", "/api/v1/console/data-sources/ranking", "getRanking", () => {
    const w = getDb().weights;
    const ranked = SOURCES.filter((s) => s.rank > 0 || s.id === "AD-09").map((s) => ({ s, sc: score(s.id, w) })).sort((a, b) => b.sc - a.sc || Number(a.s.id === "AD-09") - Number(b.s.id === "AD-09") || b.s.ratings.predictive - a.s.ratings.predictive);
    let rank = 0, prev = -1, seen = 0;
    const sources = ranked.map(({ s, sc }) => { seen += 1; if (sc !== prev) { rank = seen; prev = sc; } return { sourceId: s.id, name: s.name, rank, score: sc, ratings: s.ratings }; });
    const waterfallOrder = ranked.filter(({ s }) => s.id !== "AD-09").sort((a, b) => b.sc / (1 + b.s.costVnd / 1000) - a.sc / (1 + a.s.costVnd / 1000)).map(({ s }) => s.id);
    const segs = ["SEG-1", "SEG-2", "SEG-3", "SEG-4", "SEG-5"] as const;
    const segmentRungMatrix = segs.map((seg) => { const c = Object.values(CUSTOMER_BY_REF).find((x) => x.segment === seg)!; return { segment: seg, rungs: c.rungs.map((r) => r.sources) }; });
    return ok({ weights: w, sources, waterfallOrder, segmentRungMatrix });
  }, { log: false, baseDelay: 120 }),

  op("get", "/api/v1/console/appeals", "listAppeals", ({ req }) => {
    const status = new URL(req.url).searchParams.get("status");
    const items = (getDb().emptyMode ? [] : getDb().appeals).filter((a) => !status || a.status === status).map((a) => ({ ...a, slaState: slaOf(a) }));
    return ok(items);
  }, { log: false, baseDelay: 120 }),

  op("post", "/api/v1/console/appeals/:appealId/decision", "decideAppeal", ({ req, params, body }) => {
    const db = getDb();
    const a = db.appeals.find((x) => x.appealId === params.appealId);
    if (!a) return problem(404, tKey("Không tìm thấy yêu cầu"), "appeal-not-found");
    if (a.status === "UPHELD" || a.status === "OVERTURNED") return problem(409, tKey("Yêu cầu đã được xử lý"), "appeal-closed");
    const outcome = body.outcome as "UPHELD" | "OVERTURNED", reasonCode = String(body.reasonCode ?? "");
    const amount = Number((body.newOfferAmount as { amount?: number } | undefined)?.amount ?? 0);
    if (outcome === "OVERTURNED" && amount <= 0) return problem(422, tKey("Nhập số tiền duyệt lại"), "invalid-offer", undefined, [{ field: "newOfferAmount", message: tKey("Nhập số tiền duyệt lại") }]);
    const by = actorOf(req);
    if (outcome === "OVERTURNED" && amount > REVIEWER_AUTHORITY) {
      const appr = newApproval("APPEAL_OVERTURN", a.appealId, { appealId: a.appealId, outcome, reasonCode, amount }, tKey("Duyệt lại {0} vượt thẩm quyền", a.referenceNo), by);
      a.status = "PENDING_SECOND_APPROVAL" as never; a.pendingApprovalId = appr.approvalId;
      return ok({ ...a, slaState: slaOf(a), approval: appr });
    }
    applyAppealOutcome(a, outcome, reasonCode, by, amount);
    return ok({ ...a, slaState: slaOf(a) });
  }, { log: false, baseDelay: 150 }),

  op("post", "/api/v1/console/appeals/:appealId/information-request", "requestAppealInformation", ({ params, body }) => {
    const a = getDb().appeals.find((x) => x.appealId === params.appealId);
    if (!a) return problem(404, tKey("Không tìm thấy yêu cầu"), "appeal-not-found");
    a.status = "INFO_REQUESTED";
    webhookLog("notice.requested", String(a.partnerId), { notice: "N-16", referenceNo: a.referenceNo, message: body.message });
    return ok({ ...a, slaState: slaOf(a) });
  }, { log: false, baseDelay: 120 }),

  op("get", "/api/v1/console/learning-loop", "getLearningLoop", () => {
    const db = getDb();
    const champ = db.policy.championModel ?? "v1";
    const v1 = { name: "v1", approvalRate: 0.62, badRate: 0.031 }, v2 = { name: "v2", approvalRate: 0.66, badRate: 0.033 };
    return ok({ testBandShare: db.policy.testBandShare ?? 0.03, champion: champ === "v2" ? v2 : v1, challenger: champ === "v2" ? v1 : v2, wrongfulDeclineEstimate: 0.04, modelDocUrl: "#model-documentation" });
  }, { log: false, baseDelay: 150 }),

  op("get", "/api/v1/console/audit-log", "listAuditLog", () => ok(getDb().audit), { log: false, baseDelay: 80 }),

  op("get", "/api/v1/console/consent-ledger", "listConsentLedger", () => ok((getDb().emptyMode ? [] : getDb().consents).map((c) => ({ receiptId: c.receiptId, customerMask: `cus_…${c.customerRef.replace("cus_", "")}`, partnerId: c.partnerId, sourceId: c.sourceId, purpose: c.purpose, status: c.status, at: c.withdrawnAt ?? c.grantedAt }))), { log: false, baseDelay: 120 }),

  op("get", "/api/v1/console/tia", "getTiaStatus", () => ok({ status: "FILED", filedAt: "2026-09-30T00:00:00Z" }), { log: false, baseDelay: 80 }),

  op("get", "/api/v1/console/policies", "getPolicy", () => ok(getDb().policy), { log: false, baseDelay: 100 }),
  // Policy, weights and model changes go through versioned drafts + maker-checker approval (US-63, US-60, US-64; DD-18).
  op("post", "/api/v1/console/policy-versions", "createPolicyDraft", ({ req, body }) => {
    const db = getDb();
    const cfg = (body.config ?? {}) as { weights?: { predictive: number; coverage: number; cost: number; access: number; legal: number }; dtiCap?: number };
    if (cfg.weights) {
      const w = cfg.weights; const sum = w.predictive + w.coverage + w.cost + w.access + w.legal;
      if (Math.abs(sum - 1) > 0.001) return problem(422, tKey("Tổng trọng số phải bằng 100%"), "invalid-weights", undefined, [{ field: "weights", message: tKey("Tổng trọng số phải bằng 100%") }]);
    }
    if (cfg.dtiCap !== undefined && (cfg.dtiCap <= 0 || cfg.dtiCap > 0.6)) return problem(422, tKey("Trần DTI phải trong khoảng 0–60%"), "invalid-policy", undefined, [{ field: "dtiCap", message: tKey("Trần DTI phải trong khoảng 0–60%") }]);
    const versionNo = (db.drafts?.length ?? 0) + 8;
    const v = { policyVersionId: newId(), productType: (body.productType as string) ?? "POP_INSTALMENT", versionNo, status: "draft", config: cfg, createdBy: actorOf(req), reason: (body.reason as string) ?? "" };
    db.drafts = [v, ...(db.drafts ?? [])];
    return ok(v, 201);
  }, { log: false, baseDelay: 120 }),

  op("post", "/api/v1/console/policy-versions/:versionId/submit", "submitPolicyVersion", ({ req, params, body }) => {
    const db = getDb();
    const v = (db.drafts ?? []).find((d) => d.policyVersionId === params.versionId);
    if (!v) return problem(404, tKey("Không tìm thấy bản nháp"), "draft-not-found");
    v.status = "pending_approval";
    return ok(newApproval("POLICY_VERSION", v.policyVersionId, v.config, (body.reason as string) ?? v.reason, actorOf(req)), 201);
  }, { log: false, baseDelay: 120 }),

  op("post", "/api/v1/console/models/:modelVersionId/mode", "requestModelModeChange", ({ req, params, body }) =>
    ok(newApproval("MODEL_MODE", params.modelVersionId, { mode: body.mode, modelVersionId: params.modelVersionId }, (body.reason as string) ?? "", actorOf(req)), 201), { log: false, baseDelay: 120 }),

  op("get", "/api/v1/console/approvals", "listApprovals", () => {
    const items = (getDb().approvals ?? []).filter((a) => a.status === "PENDING");
    return ok({ items, page: 0, size: 50, totalItems: items.length });
  }, { log: false, baseDelay: 80 }),

  op("post", "/api/v1/console/approvals/:approvalId/approve", "approveChange", ({ req, params, body }) => {
    const db = getDb();
    const a = (db.approvals ?? []).find((x) => x.approvalId === params.approvalId);
    if (!a) return problem(404, tKey("Không tìm thấy yêu cầu"), "approval-not-found");
    if (a.status !== "PENDING") return problem(409, tKey("Yêu cầu đã được xử lý"), "approval-closed");
    const checker = actorOf(req);
    if (checker === a.makerId) return problem(403, tKey("Bạn không thể tự duyệt thay đổi của mình."), "own-change");
    const d = a.diff as { weights?: typeof db.weights; mode?: string; modelVersionId?: string } & Record<string, unknown>;
    if (a.kind === "APPEAL_OVERTURN") {
      const ap = db.appeals.find((x) => x.appealId === d.appealId);
      if (ap) { applyAppealOutcome(ap, "OVERTURNED", String(d.reasonCode), a.makerId, Number(d.amount)); ap.pendingApprovalId = undefined; }
      db.audit.unshift({ at: new Date().toISOString(), actor: a.makerId, action: "appeal.overturn.approve", detail: tKey("{0} (duyệt bởi {1})", ap?.referenceNo ?? "", checker) });
    } else if (a.kind === "MODEL_MODE") {
      const prev = db.policy.championModel; db.policy = { ...db.policy, championModel: d.modelVersionId } as never;
      db.audit.unshift({ at: new Date().toISOString(), actor: a.makerId, action: "learning.promote", detail: tKey("champion {0} → {1} (duyệt bởi {2})", prev, d.modelVersionId, checker) });
    } else if (d.weights) {
      db.weights = d.weights;
      db.audit.unshift({ at: new Date().toISOString(), actor: a.makerId, action: "ranking.weights", detail: tKey("{0} (duyệt bởi {1})", JSON.stringify(d.weights), checker) });
    } else {
      db.policy = { ...db.policy, ...d } as never;
      db.audit.unshift({ at: new Date().toISOString(), actor: a.makerId, action: "policy.update", detail: tKey("{0} (duyệt bởi {1})", JSON.stringify(d), checker) });
    }
    const v = (db.drafts ?? []).find((x) => x.policyVersionId === a.targetId); if (v) v.status = "active";
    a.status = "APPROVED"; a.comment = (body.comment as string) ?? "";
    return ok(a);
  }, { log: false, baseDelay: 150 }),

  op("post", "/api/v1/console/approvals/:approvalId/reject", "rejectChange", ({ params, body }) => {
    const a = (getDb().approvals ?? []).find((x) => x.approvalId === params.approvalId);
    if (!a) return problem(404, tKey("Không tìm thấy yêu cầu"), "approval-not-found");
    a.status = "REJECTED"; a.comment = (body.comment as string) ?? "";
    return ok(a);
  }, { log: false, baseDelay: 120 }),

  op("get", "/api/v1/console/partners", "listPartners", () => ok([
    { partnerId: "viettel-money", name: "Viettel Money", products: ["PAYMENT_INSTALLMENT"], webhookUrl: "https://partner.example/webhooks/creditpulse", settlementAccountMask: "••••4821", sandboxKeyMask: "sk_test_••••a1" },
    { partnerId: "grab", name: "Grab", products: ["PAYMENT_INSTALLMENT"], webhookUrl: "https://partner.example/webhooks/creditpulse", settlementAccountMask: "••••7733", sandboxKeyMask: "sk_test_••••b2" },
    { partnerId: "so-ban-hang", name: tKey("Sổ Bán Hàng"), products: ["PAYMENT_INSTALLMENT"], webhookUrl: "https://partner.example/webhooks/creditpulse", settlementAccountMask: "••••9012", sandboxKeyMask: "sk_test_••••c3" },
  ]), { log: false, baseDelay: 100 }),

  op("post", "/api/v1/console/partners/:partnerId/credentials", "issuePartnerCredential", ({ params }) => {
    getDb().audit.unshift({ at: new Date().toISOString(), actor: "integration.demo@hlb", action: "partner.credential.rotate", detail: `${params.partnerId} sandbox` });
    const rnd = () => Math.random().toString(36).slice(2, 10);
    return ok({ credentialId: newId(), clientId: `cp_${params.partnerId}_${rnd()}`, clientSecret: `cps_${rnd()}${rnd()}${rnd()}`, oldCredentialValidUntil: addDays(new Date(), 7).toISOString() }, 201);
  }, { log: false, baseDelay: 200 }),

  op("post", "/api/v1/console/partners/:partnerId/test-webhook", "sendTestWebhook", ({ params }) => {
    webhookLog("test.ping", params.partnerId, {});
    return ok({ deliveryId: newId(), eventType: "test.ping", status: "delivered", attempts: 1, lastStatusCode: 200, createdAt: new Date().toISOString() }, 202);
  }, { log: false, baseDelay: 200 }),

  op("get", "/api/v1/console/api-calls", "listApiCalls", ({ req }) => {
    const flow = new URL(req.url).searchParams.get("flow");
    return ok(getDb().calls.filter((c) => !flow || c.flow === flow || c.method === "WEBHOOK"));
  }, { log: false, baseDelay: 60 }),

  op("post", "/api/v1/demo/scenario", "setDemoScenario", ({ body }) => { getDb().scenario = body.scenario as never; getDb().ekyc = {}; return ok({}); }, { log: false, baseDelay: 30 }),
  op("post", "/api/v1/demo/reset", "resetDemoData", () => { resetDemoData(); return ok({}); }, { log: false, baseDelay: 30 }),
];
export { SOURCE_BY_ID };
