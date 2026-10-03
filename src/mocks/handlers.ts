import { http, HttpResponse, delay, type HttpHandler } from "msw";
import type { ApiCall, ConsentReceipt, Decision, DecisionSummary, Instalment, ProductType, SourceId } from "@/api/types";
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
  return { customer, connected, scenario: db.scenario, insufficient };
}
const openLoans = (ref: string) => getDb().loans.filter((l) => l.customerRef === ref && l.status !== "SETTLED").length;

/** Registers an operation: logs it for the API inspector, applies error and slow scenarios. */
function op(method: "get" | "post" | "put", path: string, operationId: string, fn: (a: { req: Request; params: Record<string, string>; body: Json }) => Promise<Response> | Response, o: { log?: boolean; baseDelay?: number } = {}): HttpHandler {
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
      res = problem(500, "Dịch vụ tạm thời gián đoạn", "internal", "Mô phỏng lỗi theo kịch bản error-" + operationId);
    } else {
      res = await fn({ req: request, params: params as Record<string, string>, body });
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
const REQUIRES_KEY = (product: ProductType) => product !== "PAYMENT_INSTALLMENT";

export const handlers: HttpHandler[] = [
  op("post", "/api/v1/prescreens", "createPrescreen", ({ body }) => {
    const ref = String(body.hashedCustomerId ?? "").replace(/^h_/, "");
    const ctx = ctxFor(ref);
    if (ctx?.customer.locked) return ok({ eligible: false, reason: ctx.customer.locked.reason });
    if (!ctx || !ctx.customer.prescreenLimit) return ok({ eligible: false });
    const lim = ctx.customer.prescreenLimit;
    return ok({ eligible: true, bandMin: money(lim / 2), bandMax: money(lim), rung: ctx.customer.rungs.at(-1)?.rung ?? 1, validUntil: addDays(new Date(), 7).toISOString() });
  }, { baseDelay: 150 }),

  op("post", "/api/v1/offers", "createOfferRequest", async ({ body }) => {
    const ref = String(body.customerRef);
    const ctx = ctxFor(ref);
    if (!ctx) return problem(404, "Không tìm thấy khách hàng", "customer-not-found");
    if (ctx.customer.locked) return problem(422, ctx.customer.locked.reason, "not-eligible", ctx.customer.locked.reason);
    const amount = Number((body.amount as { amount: number }).amount);
    const product = body.productType as ProductType;
    if (product === "PAYMENT_INSTALLMENT" && (amount < RANGE.min || amount > RANGE.max)) return problem(422, "Giá trị đơn hàng ngoài phạm vi trả góp", "order-out-of-range");
    if (getDb().scenario === "SLOW") await delay(3500);
    const id = newId();
    getDb().offers[id] = { offerRequestId: id, customerRef: ref, partnerId: String(body.partnerId), productType: product, amount, orderRef: body.orderRef as string | undefined, createdAt: new Date().toISOString() };
    return ok(offerSetFor(ctx, product, amount, id), 201);
  }, { baseDelay: 650 }),

  op("get", "/api/v1/offers/:offerRequestId", "getOfferSet", ({ params }) => {
    const o = getDb().offers[params.offerRequestId];
    if (!o) return problem(404, "Không tìm thấy gói trả góp", "offer-not-found");
    return ok(offerSetFor(ctxFor(o.customerRef)!, o.productType, o.amount, o.offerRequestId));
  }, { log: false, baseDelay: 120 }),

  op("post", "/api/v1/consents", "createConsent", ({ body }) => {
    const db = getDb();
    const ref = String(body.customerRef), src = body.sourceId as SourceId;
    const existing = db.consents.find((c) => c.customerRef === ref && c.sourceId === src && c.status === "GRANTED");
    if (existing) return ok(existing, 201);
    const customer = CUSTOMER_BY_REF[ref];
    if (!customer) return problem(404, "Không tìm thấy khách hàng", "customer-not-found");
    const r: ConsentReceipt = { receiptId: newId(), customerRef: ref, partnerId: customer.partnerId, sourceId: src, purpose: String(body.purpose ?? "Đánh giá khả năng trả nợ"), status: "GRANTED", grantedAt: new Date().toISOString() };
    const before = currentLimit(ctxFor(ref)!);
    db.consents = [r, ...db.consents];
    const after = currentLimit(ctxFor(ref)!);
    if (after !== before && db.policy.cicRefreshOnLimitChange) db.audit.unshift({ at: new Date().toISOString(), actor: "system", action: "cic.refresh", detail: `${ref}: hạn mức ${before} → ${after}; hồ sơ CIC đã tra và lưu` });
    return ok(r, 201);
  }, { baseDelay: 150 }),

  op("get", "/api/v1/customers/:customerRef/consents", "listConsents", ({ params }) => ok(getDb().consents.filter((c) => c.customerRef === params.customerRef)), { log: false, baseDelay: 100 }),

  op("post", "/api/v1/consents/:receiptId/withdraw", "withdrawConsent", ({ params }) => {
    const c = getDb().consents.find((x) => x.receiptId === params.receiptId);
    if (!c) return problem(404, "Không tìm thấy mã đồng ý", "consent-not-found");
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
    if (!ctx) return problem(404, "Không tìm thấy khách hàng", "customer-not-found");
    return ok(ladderFor(ctx));
  }, { log: false, baseDelay: 150 }),

  op("post", "/api/v1/assessments", "createAssessment", ({ body }) => {
    const db = getDb();
    const ref = String(body.customerRef);
    const ctx = ctxFor(ref);
    if (!ctx) return problem(404, "Không tìm thấy khách hàng", "customer-not-found");
    const product = body.productType as ProductType;
    const ek = db.ekyc[ref];
    if (!(ctx.customer.ekycDone || ek?.status === "PASSED")) return problem(422, "Cần xác thực danh tính trước khi xét duyệt", "ekyc-required");
    const need = REQUIRES_KEY(product) ? ctx.customer.rungs.at(-1)!.sources.filter((s) => !["B-01", "AD-02"].includes(s)) : [];
    if (need.some((s) => !ctx.connected.has(s))) return problem(422, "Cần đồng ý chia sẻ dữ liệu trước khi xét duyệt", "consent-required");
    const amount = Number((body.amount as { amount: number }).amount);
    const out = assess({ ctx, amount, product, packageId: body.packageId as string | undefined, openLoans: openLoans(ref), maxOpenLoans: db.policy.maxOpenLoans, dtiCap: db.policy.dtiCap });
    const d: StoredDecision = { ...(out as Decision), decisionId: newId(), decidedAt: new Date().toISOString(), customerRef: ref, partnerId: ctx.customer.partnerId, productType: product, amount, packageId: body.packageId as string | undefined };
    db.decisions[d.decisionId] = d;
    if (d.tier === "MANUAL") db.manual = [{ caseId: newId(), decisionId: d.decisionId, slaDueAt: new Date(Date.now() + 4 * 3_600_000).toISOString(), status: "OPEN", suggestedAction: "Cần xem thêm" }, ...db.manual];
    return ok(d, 201);
  }, { baseDelay: 900 }),

  op("get", "/api/v1/decisions/:decisionId", "getDecision", ({ params }) => {
    const d = getDb().decisions[params.decisionId];
    return d ? ok(d) : problem(404, "Không tìm thấy quyết định", "decision-not-found");
  }, { log: false, baseDelay: 100 }),

  op("post", "/api/v1/contracts", "createContract", ({ body }) => {
    const db = getDb();
    const d = db.decisions[String(body.decisionId)];
    if (!d || d.outcome !== "APPROVED") return problem(422, "Chỉ tạo hợp đồng cho khoản đã được duyệt", "decision-not-approved");
    const pkgs = buildPackages(d.productType, d.amount, Number.MAX_SAFE_INTEGER);
    const p = pkgs.find((x) => x.packageId === body.packageId) ?? pkgs[0];
    const weekly = d.productType === "DRIVER_INSTANT_LOAN";
    const schedule = makeSchedule({ months: p.tenorMonths, total: p.totalPayable.amount, paid: 0, weekly });
    const id = newId();
    const eir = eirFor(d.amount, p.totalPayable.amount / p.tenorMonths, p.tenorMonths);
    const c = { contractId: id, lender: "Hong Leong Bank Vietnam", amount: money(d.amount), tenorMonths: p.tenorMonths, totalPayable: p.totalPayable, eir, schedule, keyFacts: ["Không có phí ẩn"], status: "DRAFT" as const, decisionId: d.decisionId, customerRef: d.customerRef, partnerId: d.partnerId, productType: d.productType, principal: d.amount, packageId: p.packageId };
    db.contracts[id] = c;
    return ok(c, 201);
  }, { baseDelay: 300 }),

  op("post", "/api/v1/contracts/:contractId/sign", "signContract", ({ params, body }) => {
    const db = getDb();
    const c = db.contracts[params.contractId];
    if (!c) return problem(404, "Không tìm thấy hợp đồng", "contract-not-found");
    if (db.scenario === "SESSION_EXPIRED") { db.scenario = "APPROVE"; c.status = "EXPIRED"; return problem(410, "Phiên đã hết hạn", "session-expired"); }
    if (String(body.otp) !== "123456") return problem(422, "Mã OTP chưa đúng", "otp-invalid");
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
    if (!l) return problem(404, "Không tìm thấy khoản vay", "loan-not-found");
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
    if (!l) return problem(404, "Không tìm thấy khoản vay", "loan-not-found");
    const interestLeft = Math.max(0, l.totalRemaining.amount - l.principalRemaining.amount);
    return ok({ loanId: l.loanId, payoff: l.principalRemaining, interestSaved: money(interestLeft), validUntil: addDays(new Date(), 1).toISOString() });
  }, { baseDelay: 200 }),

  op("post", "/api/v1/webhooks/refunds", "receiveRefundEvent", ({ body }) => {
    const l = getDb().loans.find((x) => x.loanId === body.loanId);
    if (!l) return problem(404, "Không tìm thấy khoản vay", "loan-not-found");
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

  op("post", "/api/v1/webhooks/payouts", "receivePayoutEvent", ({ body }) => {
    const l = getDb().loans.find((x) => x.loanId === body.loanId);
    if (!l) return problem(404, "Không tìm thấy khoản vay", "loan-not-found");
    const income = Number((body.incomeAmount as { amount: number }).amount);
    const cur = l.schedule.find((s) => s.status === "DUE" || s.status === "PAUSED");
    const hist = ((getDb().payouts ??= {})[l.loanId] ??= [3_300_000, 3_400_000]);
    const drops = [hist.at(-1)!, income].map((v, k, a) => (k === 0 ? false : v < a[k - 1] * 0.5));
    const prevDrop = hist.length >= 2 && hist.at(-1)! < hist.at(-2)! * 0.5;
    if (income > 0) hist.push(income);
    const scaled = income > 0 && drops[1] && prevDrop;
    let deducted = 0, reason = "Tuần không có thu nhập, không khấu trừ";
    if (income > 0 && cur) {
      deducted = Math.min(cur.amount.amount || 170_000, Math.round(income * (scaled ? 0.025 : 0.05)));
      cur.status = "PAID";
      reason = scaled ? "Thu nhập giảm hơn 50% hai kỳ liên tiếp. Đã giảm mức khấu trừ một nửa. Nhắc nhở: hãy liên hệ hỗ trợ nếu bạn cần thêm thời gian" : "Đã khấu trừ theo thu nhập tuần";
    }
    else if (cur) { cur.status = "PAUSED"; cur.amount = money(0); }
    const rest = l.schedule.filter((s) => s.status !== "PAID").reduce((a, s) => a + s.amount.amount, 0);
    l.totalRemaining = money(rest);
    webhookLog("payout.received", "grab", { loanId: l.loanId, cycleId: body.cycleId, income });
    return ok({ loanId: l.loanId, cycleId: String(body.cycleId), deducted: money(deducted), reason, remaining: l.totalRemaining });
  }, { baseDelay: 200 }),

  op("post", "/api/v1/webhooks/settlements", "receiveSettlementEvent", ({ body }) => {
    const l = getDb().loans.find((x) => x.loanId === body.loanId);
    if (!l) return problem(404, "Không tìm thấy khoản vay", "loan-not-found");
    const gross = Number((body.grossAmount as { amount: number }).amount);
    const share = Math.round(gross * 0.1);
    const nextMin = l.schedule.find((x) => x.status === "DUE" || x.status === "LATE");
    if (nextMin) nextMin.dueDate = addDays(new Date(), 60).toISOString().slice(0, 10);
    l.totalRemaining = money(Math.max(0, l.totalRemaining.amount - share));
    l.principalRemaining = money(Math.max(0, l.principalRemaining.amount - Math.round(share * 0.9)));
    webhookLog("settlement.received", "so-ban-hang", { loanId: l.loanId, gross, share });
    return ok({ loanId: l.loanId, cycleId: String(body.settlementId), deducted: money(share), reason: "Đã trả 10% từ tiền hàng về", remaining: l.totalRemaining });
  }, { baseDelay: 200 }),

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
      decisionId: d.decisionId, customerMask: `cus_…${d.customerRef.replace("cus_", "").slice(0, 6)}`, partnerId: d.partnerId as never, productType: d.productType, amount: money(d.amount), outcome: d.outcome, tier: d.tier, latencyMs: d.latencyMs, decidedAt: d.decidedAt,
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

  op("put", "/api/v1/console/data-sources/ranking", "updateRankingWeights", ({ body }) => {
    const w = body as unknown as { predictive: number; coverage: number; cost: number; access: number; legal: number };
    const sum = w.predictive + w.coverage + w.cost + w.access + w.legal;
    if (Math.abs(sum - 1) > 0.001) return problem(422, "Tổng trọng số phải bằng 100%", "invalid-weights", undefined, [{ field: "weights", message: "Tổng trọng số phải bằng 100%" }]);
    getDb().weights = w;
    getDb().audit.unshift({ at: new Date().toISOString(), actor: "operator.demo@hlb", action: "ranking.weights", detail: JSON.stringify(w) });
    return ok({ weights: w, sources: [] });
  }, { log: false, baseDelay: 150 }),

  op("get", "/api/v1/console/manual-queue", "listManualCases", () => ok(getDb().emptyMode ? [] : getDb().manual), { log: false, baseDelay: 120 }),

  op("post", "/api/v1/console/manual-queue/:caseId/resolution", "resolveManualCase", ({ params, body }) => {
    const db = getDb();
    const m = db.manual.find((x) => x.caseId === params.caseId);
    if (!m) return problem(404, "Không tìm thấy hồ sơ", "case-not-found");
    m.status = "RESOLVED";
    const d = db.decisions[m.decisionId];
    if (d) { d.outcome = body.action === "APPROVE" ? "APPROVED" : "DECLINED"; d.approvedAmount = body.action === "APPROVE" ? money(d.amount) : undefined; }
    db.audit.unshift({ at: new Date().toISOString(), actor: "operator.demo@hlb", action: "manual.resolve", detail: `${body.action} ${body.reasonCode}` });
    return ok(m);
  }, { log: false, baseDelay: 150 }),

  op("get", "/api/v1/console/learning-loop", "getLearningLoop", () => {
    const db = getDb();
    const champ = db.policy.championModel ?? "v1";
    const v1 = { name: "v1", approvalRate: 0.62, badRate: 0.031 }, v2 = { name: "v2", approvalRate: 0.66, badRate: 0.033 };
    return ok({ testBandShare: db.policy.testBandShare ?? 0.03, champion: champ === "v2" ? v2 : v1, challenger: champ === "v2" ? v1 : v2, wrongfulDeclineEstimate: 0.04, modelDocUrl: "#model-documentation" });
  }, { log: false, baseDelay: 150 }),

  op("get", "/api/v1/console/audit-log", "listAuditLog", () => ok(getDb().audit), { log: false, baseDelay: 80 }),

  op("get", "/api/v1/console/consent-ledger", "listConsentLedger", () => ok((getDb().emptyMode ? [] : getDb().consents).map((c) => ({ receiptId: c.receiptId, customerMask: `cus_…${c.customerRef.replace("cus_", "")}`, partnerId: c.partnerId, sourceId: c.sourceId, purpose: c.purpose, status: c.status, at: c.withdrawnAt ?? c.grantedAt }))), { log: false, baseDelay: 120 }),

  op("get", "/api/v1/console/tia", "getTiaStatus", () => ok({ status: "FILED", filedAt: "2026-09-30T00:00:00Z", note: "Mô phỏng" }), { log: false, baseDelay: 80 }),

  op("get", "/api/v1/console/policies", "getPolicy", () => ok(getDb().policy), { log: false, baseDelay: 100 }),
  op("put", "/api/v1/console/policies", "updatePolicy", ({ body }) => {
    const p = body as unknown as { dtiCap: number; maxOpenLoans: number };
    if (p.dtiCap <= 0 || p.dtiCap > 0.6) return problem(422, "Trần DTI phải trong khoảng 0–60%", "invalid-policy", undefined, [{ field: "dtiCap", message: "Trần DTI phải trong khoảng 0–60%" }]);
    const prevChampion = getDb().policy.championModel;
    getDb().policy = { ...getDb().policy, ...(body as object) } as never;
    const promoted = getDb().policy.championModel !== prevChampion;
    getDb().audit.unshift({ at: new Date().toISOString(), actor: "operator.demo@hlb", action: promoted ? "learning.promote" : "policy.update", detail: promoted ? `champion ${prevChampion} → ${getDb().policy.championModel}` : JSON.stringify(body) });
    return ok(getDb().policy);
  }, { log: false, baseDelay: 150 }),

  op("get", "/api/v1/console/partners", "listPartners", () => ok([
    { partnerId: "viettel-money", name: "Viettel Money", products: ["PAYMENT_INSTALLMENT"], webhookUrl: "https://partner.example/webhooks/creditpulse", settlementAccountMask: "••••4821", sandboxKeyMask: "sk_test_••••a1" },
    { partnerId: "grab", name: "Grab", products: ["DRIVER_INSTANT_LOAN"], webhookUrl: "https://partner.example/webhooks/creditpulse", settlementAccountMask: "••••7733", sandboxKeyMask: "sk_test_••••b2" },
    { partnerId: "so-ban-hang", name: "Sổ Bán Hàng", products: ["SELLER_FUNDING"], webhookUrl: "https://partner.example/webhooks/creditpulse", settlementAccountMask: "••••9012", sandboxKeyMask: "sk_test_••••c3" },
  ]), { log: false, baseDelay: 100 }),

  op("post", "/api/v1/console/partners/:partnerId/test-webhook", "sendTestWebhook", ({ params }) => {
    webhookLog("test.ping", params.partnerId, {});
    return ok(getDb().calls[0], 202);
  }, { log: false, baseDelay: 200 }),

  op("get", "/api/v1/console/api-calls", "listApiCalls", ({ req }) => {
    const flow = new URL(req.url).searchParams.get("flow");
    return ok(getDb().calls.filter((c) => !flow || c.flow === flow || c.method === "WEBHOOK"));
  }, { log: false, baseDelay: 60 }),

  op("post", "/api/v1/demo/scenario", "setDemoScenario", ({ body }) => { getDb().scenario = body.scenario as never; getDb().ekyc = {}; return ok({}); }, { log: false, baseDelay: 30 }),
  op("post", "/api/v1/demo/reset", "resetDemoData", () => { resetDemoData(); return ok({}); }, { log: false, baseDelay: 30 }),
];
export { SOURCE_BY_ID };
