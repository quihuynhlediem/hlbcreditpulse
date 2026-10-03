"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useCreateAssessment, useCreateOffer, useCreatePayment, usePayoutEvent, useSettlementEvent, useSettlementQuote } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { track } from "@/api/track";
import type { Package } from "@/api/types";
import type { FrameProps } from "@/components/grab/GrabFrame";
import { Btn, Card, Chip, ErrorBox, KV, Lockup, Skel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dmy, eirText, vnd } from "@/lib/format";
import { nextDue, paidCount, useProductLoan } from "@/lib/useLoan";
import type { LenderCfg } from "@/lib/lenders";
import { useFlow } from "@/store/flow";
import { ConsentSheet } from "./Consent";
import { ContractView } from "./Contract";
import { DecisionView } from "./Decision";
import { EkycFlow } from "./Ekyc";

type Frame = ComponentType<FrameProps>;

/** Weeks in a tenor (Grab deducts per weekly payout); seller funding is shown per settlement. */
const weeks = (months: number) => Math.round((months * 52) / 12);

function perCycle(cfg: LenderCfg, p: Package) {
  return cfg.key === "grab" ? `Khoảng ${vnd(Math.round(p.totalPayable.amount / weeks(p.tenorMonths) / 1000) * 1000)} mỗi kỳ nhận tiền` : "10% mỗi kỳ tiền hàng về";
}

/* ------------------------------------------------------------------ SCR-42 / SCR-53 offer */
function OfferInner({ cfg, Frame }: { cfg: LenderCfg; Frame: Frame }) {
  const router = useRouter();
  const consentOpen = useSearchParams().get("consent") === "1";
  const { persona, amount: saved, set } = useFlow();
  const [amount, setAmount] = useState(saved ?? cfg.defaultAmount);
  const [committed, setCommitted] = useState(amount);
  const [rev, setRev] = useState(0);
  const [sel, setSel] = useState<string>();
  const [source, setSource] = useState(consentOpen);
  const [detail, setDetail] = useState<string>();
  const create = useCreateOffer();
  const data = create.data;

  useEffect(() => { const t = setTimeout(() => setCommitted(amount), 350); return () => clearTimeout(t); }, [amount]);
  useEffect(() => {
    create.mutate(
      { partnerId: cfg.partnerId, productType: cfg.product, customerRef: persona, amount: { amount: committed, currency: "VND" }, consentReceiptIds: [] },
      {
        onSuccess: (o) => {
          set({ offerRequestId: o.offerRequestId, amount: committed });
          setSel((s) => o.packages.find((p) => p.packageId === s && p.available)?.packageId ?? o.packages.find((p) => p.available)?.packageId);
        },
      },
    );
  }, [committed, persona, rev]); // eslint-disable-line react-hooks/exhaustive-deps

  const err = create.error instanceof ApiError ? create.error : undefined;
  const chosen = data?.packages.find((p) => p.packageId === sel && p.available);
  const next = data?.nextRung;
  return (
    <Frame
      scr={cfg.offerScr} title={cfg.offerTitle} back={cfg.base}
      footer={<><Lockup /><Btn data-testid="offer-continue" disabled={!chosen || create.isPending} onClick={() => { set({ packageId: chosen!.packageId, tenor: chosen!.tenorMonths }); router.push(`${cfg.base}/loan/decision/new`); }}>Tiếp tục</Btn></>}
    >
      <div className="flex flex-col gap-3 p-4" data-testid="lender-offer">
        {err?.type?.endsWith("not-eligible") ? (
          <Card tone="warn" className="space-y-1" role="status" data-testid="locked"><div className="text-sm font-semibold">Chưa mở khóa</div><p className="text-[13px] text-ink">{err.detail ?? err.message}</p></Card>
        ) : err ? (
          <ErrorBox onRetry={() => setRev((r) => r + 1)}>Chưa thể tải gói vay lúc này. Bạn thử lại nhé.</ErrorBox>
        ) : (
          <>
            <Card className="space-y-3">
              <div className="text-xs text-muted">{cfg.amountLabel}</div>
              <div className="text-[28px] font-bold text-primary" data-testid="amount">{vnd(amount)}</div>
              <input type="range" aria-label={cfg.amountLabel} min={cfg.min} max={cfg.max} step={cfg.step} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
              <div className="flex justify-between text-[11px] text-muted"><span>{vnd(cfg.min)}</span><span>{vnd(cfg.max)}</span></div>
            </Card>
            {data && (
              <Card tone="soft" className="space-y-1.5" data-testid="limit-card">
                <div className="flex justify-between text-xs"><span className="text-muted">Hạn mức hiện tại</span><span className="text-sm font-bold text-primary" data-testid="offer-limit">{vnd(data.limit.amount)}</span></div>
                {next && <Btn variant="secondary" data-testid="unlock-source" onClick={() => setSource(true)}>{cfg.unlockCta(vnd(next.unlockLimit.amount))}</Btn>}
              </Card>
            )}
            <p className="text-[13px] text-ink">{cfg.repayRule}. {cfg.zeroRule}</p>
            {!data ? <><Skel className="h-24" /><Skel className="h-24" /></> : (
              <div className={cn("space-y-3", create.isPending && "opacity-60")}>
                {data.packages.map((p) => (
                  <div key={p.packageId} data-testid="package-card" data-available={p.available} className={cn("space-y-2 rounded-2xl border-2 bg-card p-3.5", sel === p.packageId && p.available ? "border-primary" : "border-line", !p.available && "opacity-60")}>
                    <button className="w-full space-y-2 text-left disabled:cursor-not-allowed" disabled={!p.available} aria-pressed={sel === p.packageId} onClick={() => setSel(p.packageId)}>
                      <div className="flex items-center justify-between"><span className="text-base font-bold">{p.tenorMonths} tháng</span>{sel === p.packageId && p.available && <Chip tone="success">Đã chọn</Chip>}</div>
                      <KV k="Mức trả" v={perCycle(cfg, p)} bold />
                      <KV k="Tổng số tiền phải trả" v={vnd(p.totalPayable.amount)} />
                      <KV k="Lãi suất hiệu dụng (EIR)" v={eirText(p.eir)} />
                      {!p.available && <p className="text-xs font-semibold text-warning">{p.disabledReason}</p>}
                    </button>
                    <button className="text-xs font-semibold text-primary" onClick={() => setDetail(detail === p.packageId ? undefined : p.packageId)}>Chi phí chi tiết</button>
                    {detail === p.packageId && (
                      <div className="space-y-1 rounded-lg bg-primary-soft p-2.5 text-xs" data-testid="cost-detail">
                        <KV k="Số tiền nhận" v={vnd(committed)} />
                        <KV k="Lãi và phí" v={vnd(p.totalPayable.amount - committed)} />
                        <KV k="Tất toán sớm" v="Không phí ẩn" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {source && (
        <ConsentSheet
          sourceId={cfg.source} customerRef={persona} partnerId={cfg.partnerId} partnerName={cfg.partnerName}
          declineHint={`Không kết nối thì hạn mức giữ ở ${vnd(data?.limit.amount ?? 0)}`}
          onGranted={() => { setSource(false); setRev((r) => r + 1); }}
          onDeclined={() => setSource(false)}
        />
      )}
    </Frame>
  );
}
export function LenderOffer(p: { cfg: LenderCfg; Frame: Frame }) { return <Suspense><OfferInner {...p} /></Suspense>; }

/* ------------------------------------------------------------------ SCR-44 / SCR-55 eKYC */
export function LenderEkyc({ cfg, Frame }: { cfg: LenderCfg; Frame: Frame }) {
  const router = useRouter();
  const { persona, ekycDone, set } = useFlow();
  return (
    <Frame scr={cfg.ekycScr} title="Xác thực danh tính" back={() => router.back()}>
      <EkycFlow customerRef={persona} cancelLabel="Quay lại" onPassed={() => { set({ ekycDone: { ...ekycDone, [persona]: true } }); router.push(`${cfg.base}/loan/decision/new`); }} onCancel={() => router.push(`${cfg.base}/loan/offer`)} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ SCR-45 / SCR-56 decision */
export function LenderDecision({ cfg, Frame }: { cfg: LenderCfg; Frame: Frame }) {
  const { decisionId } = useParams<{ decisionId: string }>();
  const router = useRouter();
  const { persona, amount, packageId, tenor, set } = useFlow();
  const assess = useCreateAssessment();
  const started = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const isNew = decisionId === "new";
  const run = () => {
    setErr(null);
    assess.mutate(
      { customerRef: persona, packageId: packageId ?? "pkg-6", productType: cfg.product, amount: { amount: amount ?? cfg.defaultAmount, currency: "VND" } },
      {
        onSuccess: (d) => { set({ decisionId: d.decisionId }); track("decision_returned", { outcome: d.outcome, tier: d.tier, stp: d.tier === "STP", latencyMs: d.latencyMs }); router.replace(`${cfg.base}/loan/decision/${d.decisionId}`); },
        onError: (e) => {
          if (e instanceof ApiError && e.type?.endsWith("ekyc-required")) router.replace(`${cfg.base}/loan/ekyc`);
          else if (e instanceof ApiError && e.type?.endsWith("consent-required")) router.replace(`${cfg.base}/loan/offer?consent=1`);
          else setErr("Chưa có kết quả. Hồ sơ của bạn được giữ, bạn thử lại nhé.");
        },
      },
    );
  };
  useEffect(() => { if (!isNew || started.current) return; started.current = true; run(); }, [isNew]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Frame scr={cfg.decisionScr} title="Kết quả xét duyệt" back={cfg.base}>
      {err ? <div className="p-4"><ErrorBox onRetry={() => { started.current = true; run(); }}>{err}</ErrorBox></div> : (
        <DecisionView
          decisionId={isNew ? undefined : decisionId}
          unit={tenor ? `${tenor} tháng` : undefined}
          terms={cfg.repayRule}
          onContinue={() => router.push(`${cfg.base}/loan/contract/${decisionId}`)}
          onSmaller={() => router.push(`${cfg.base}/loan/offer`)}
          onConnect={() => router.push(`${cfg.base}/loan/offer?consent=1`)}
          onOther={() => router.push(cfg.base)}
        />
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ contract */
export function LenderContract({ cfg, Frame }: { cfg: LenderCfg; Frame: Frame }) {
  const { decisionId } = useParams<{ decisionId: string }>();
  const router = useRouter();
  const { packageId, set } = useFlow();
  return (
    <Frame scr={cfg.contractScr} title="Hợp đồng vay" back={() => router.back()}>
      <ContractView
        decisionId={decisionId} packageId={packageId}
        extraFacts={[["Cách trả", cfg.repayRule], ["Khi không có thu nhập", cfg.zeroRule.replace(/\.$/, "")]]}
        onSigned={(loan) => { set({ loanId: loan.loanId }); router.push(`${cfg.schedulePath}?signed=1`); }}
        onCancel={() => router.push(cfg.base)}
      />
    </Frame>
  );
}

/* ------------------------------------------------------------------ SCR-46 schedule / SCR-57 tracker */
function ScheduleInner({ cfg, Frame }: { cfg: LenderCfg; Frame: Frame }) {
  const q = useSearchParams();
  const router = useRouter();
  const { persona } = useFlow();
  const { loan, isLoading, isError, refetch } = useProductLoan(persona, cfg.product);
  const payout = usePayoutEvent();
  const settle = useSettlementEvent();
  const pay = useCreatePayment();
  const [quoteOn, setQuoteOn] = useState(false);
  const quote = useSettlementQuote(loan?.loanId, quoteOn);
  const [note, setNote] = useState<string | null>(null);
  const pushed = useRef(false);
  const [now] = useState(() => Date.now());

  const lowN = useRef(0);
  const simulate = (income = 3_400_000) => {
    if (!loan) return;
    const onDone = (r: { reason?: string; deducted: { amount: number } }) => setNote(`${r.reason ?? "Đã cập nhật"}${r.deducted.amount ? ` · ${vnd(r.deducted.amount)}` : ""}`);
    if (cfg.key === "grab") payout.mutate({ loanId: loan.loanId, cycleId: `cycle-${Math.round(performance.now())}`, incomeAmount: { amount: income, currency: "VND" } }, { onSuccess: onDone });
    else settle.mutate({ loanId: loan.loanId, settlementId: `st-${Math.round(performance.now())}`, grossAmount: { amount: 4_200_000, currency: "VND" } }, { onSuccess: onDone });
  };
  useEffect(() => {
    if (q.get("push") !== "1" || !loan || pushed.current) return;
    pushed.current = true;
    simulate();
  }, [loan]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <Frame scr={cfg.scheduleScr} title={cfg.scheduleTitle} back={cfg.base}><div className="space-y-3 p-4"><Skel className="h-28" /><Skel className="h-16" /><Skel className="h-16" /></div></Frame>;
  if (isError) return <Frame scr={cfg.scheduleScr} title={cfg.scheduleTitle} back={cfg.base}><div className="p-4"><ErrorBox onRetry={() => refetch()}>Không tải được lịch trả. Thử lại.</ErrorBox></div></Frame>;
  if (!loan) return <Frame scr={cfg.scheduleScr} title={cfg.scheduleTitle} back={cfg.base}><div className="p-4"><Card><p className="text-sm">Bạn chưa có khoản vay.</p></Card></div></Frame>;

  const due = nextDue(loan);
  const paid = loan.schedule.filter((s) => s.status === "PAID").reduce((a, s) => a + s.amount.amount, 0);
  const total = paid + loan.totalRemaining.amount;
  const pct = total ? Math.round((paid / total) * 100) : 0;
  const daysToMin = due ? Math.max(0, Math.ceil((new Date(due.dueDate).getTime() - now) / 86_400_000)) : 0;
  const upcoming = loan.schedule.filter((s) => s.status !== "PAID").slice(0, 6);
  return (
    <Frame scr={cfg.scheduleScr} title={cfg.scheduleTitle} back={cfg.base}>
      <div className="flex flex-col gap-3 p-4" data-testid="schedule" data-product={cfg.product}>
        {q.get("signed") === "1" && <div role="status" className="rounded-xl bg-success/10 p-3 text-[13px] font-semibold text-success" data-testid="signed-note">Đã ký hợp đồng. {cfg.key === "grab" ? "Tiền sẽ được chuyển về tài khoản của bạn trong ít phút." : "Tiền được chuyển thẳng cho nhà cung cấp."}</div>}
        {note && <div role="status" className="rounded-xl bg-primary-soft p-3 text-[13px] font-semibold text-primary" data-testid="payout-note">{note}</div>}
        <Card tone="brand" className="space-y-1.5">
          <div className="text-xs">Còn phải trả</div>
          <div className="text-[28px] font-bold" data-testid="remaining">{vnd(loan.totalRemaining.amount)}</div>
          <div className="text-[13px]">Còn khoảng {vnd(loan.principalRemaining.amount)} gốc · Đã trả {paidCount(loan)} kỳ</div>
          <div className="h-2 overflow-hidden rounded bg-white/30"><div className="h-full rounded bg-white" style={{ width: `${pct}%` }} /></div>
        </Card>
        {cfg.key === "grab" && due && (
          <Card className="space-y-1" data-testid="current-cycle">
            <div className="text-xs text-muted">Kỳ này · {dmy(due.dueDate)}</div>
            {due.status === "PAUSED" || due.amount.amount === 0
              ? <div className="text-base font-bold text-success">0 ₫ <span className="text-[13px] font-medium text-ink">(tuần không có thu nhập)</span></div>
              : <div className="text-base font-bold">{vnd(due.amount.amount)}</div>}
          </Card>
        )}
        {cfg.key === "sbh" && due && (
          <Card className="space-y-1" data-testid="min-countdown">
            <div className="text-xs text-muted">Kỳ tối thiểu tiếp theo · {dmy(due.dueDate)}</div>
            <div className="text-base font-bold">Còn {daysToMin} ngày đến kỳ tối thiểu</div>
            <p className="text-xs text-muted">{cfg.repayRule}</p>
            {daysToMin <= 15 && <p role="alert" className="rounded-lg bg-warning p-2 text-xs font-semibold text-white" data-testid="min-warning">Đã 45 ngày chưa đạt mức tối thiểu. Còn {daysToMin} ngày: hãy để tiền hàng về qua Sổ Bán Hàng hoặc trả thêm.</p>}
          </Card>
        )}
        <Card className="space-y-2" data-testid="schedule-list">
          <div className="text-[13px] font-semibold">Các kỳ sắp tới</div>
          {upcoming.map((s) => (
            <div key={s.number} className="flex items-center justify-between text-[13px]">
              <span className="text-muted">Kỳ {s.number} · {dmy(s.dueDate)}</span>
              <span className={cn("font-semibold", s.status === "PAUSED" && "text-success")}>{s.status === "PAUSED" || s.amount.amount === 0 ? "0 ₫ · tạm dừng" : vnd(s.amount.amount)}</span>
            </div>
          ))}
        </Card>
        {cfg.key === "grab" && <Card tone="soft" className="space-y-1" data-testid="holiday-card"><div className="text-[13px] font-semibold">Nghỉ Tết Nguyên đán</div><p className="text-xs text-ink">Mỗi năm một tuần nghỉ lễ, không khấu trừ. Tuần không có thu nhập cũng không khấu trừ.</p></Card>}
        {quoteOn && (
          <Card className="space-y-1.5" data-testid="settle-quote">
            {quote.isLoading ? <Skel className="h-12" /> : quote.data ? (
              <>
                <KV k="Số tiền tất toán" v={vnd(quote.data.payoff.amount)} bold />
                <KV k="Tiết kiệm lãi" v={vnd(quote.data.interestSaved?.amount ?? 0)} />
                <Btn data-testid="settle-confirm" disabled={pay.isPending} onClick={() => pay.mutate({ loanId: loan.loanId, amount: loan.totalRemaining }, { onSuccess: () => { setQuoteOn(false); setNote("Đã tất toán sớm khoản vay."); } })}>Xác nhận tất toán</Btn>
              </>
            ) : <ErrorBox onRetry={() => quote.refetch()}>Không lấy được số tiền tất toán.</ErrorBox>}
          </Card>
        )}
        <div className="space-y-2">
          <Btn variant="secondary" data-testid="simulate" onClick={() => simulate()} disabled={payout.isPending || settle.isPending}>{cfg.key === "grab" ? "Mô phỏng nhận thu nhập tuần (demo)" : "Mô phỏng tiền hàng về (demo)"}</Btn>
          {cfg.key === "grab" && <Btn variant="secondary" data-testid="simulate-low" disabled={payout.isPending} onClick={() => { lowN.current += 1; simulate(lowN.current === 1 ? 1_200_000 : 450_000); }}>Mô phỏng tuần thu nhập thấp (demo)</Btn>}
          <Btn variant="secondary" data-testid="early-settle" onClick={() => setQuoteOn((v) => !v)}>{cfg.key === "grab" ? "Tất toán sớm" : "Trả thêm / tất toán sớm"}</Btn>
          <Btn variant="ghost" onClick={() => router.push(`${cfg.base}/loan/offer`)}>Vay thêm</Btn>
        </div>
        <div className="flex justify-center"><Lockup /></div>
      </div>
    </Frame>
  );
}
export function LenderSchedule(p: { cfg: LenderCfg; Frame: Frame }) { return <Suspense><ScheduleInner {...p} /></Suspense>; }
