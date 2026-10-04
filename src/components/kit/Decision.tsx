"use client";
import { useState } from "react";
import { useCreateAppeal, useDecision } from "@/api/hooks";
import { track } from "@/api/track";
import { Btn, Card, Chip, ErrorBox, Lockup, Skel } from "@/components/ui";
import { lc, tr, useT } from "@/i18n";
import { vnd } from "@/lib/format";
import { SOURCE_BY_ID } from "@/mocks/fixtures";
import { BottomBar } from "./PhoneShell";

const dmyFull = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };

/**
 * Decision screen (SCR-27, 45, 56). The engine always decides (R-25, D-77): approved, counter-offer or not approved,
 * with plain reasons and a path. A counter-offer or a decline can be sent for human reassessment (US-78, D-78). Never shows a score.
 */
export function DecisionView({ decisionId, unit = "6 tháng", terms, onContinue, onSmaller, onOther, onConnect, continueLabel = "Tiếp tục ký hợp đồng", acceptCounter = false }: {
  decisionId?: string;
  unit?: string;
  terms?: string;
  onContinue: () => void;
  onSmaller?: () => void;
  onOther?: () => void;
  onConnect?: () => void;
  continueLabel?: string;
  /** Loan products can be signed at the counter-offered amount; a checkout order cannot be part-financed. */
  acceptCounter?: boolean;
}) {
  const t = useT();
  const { data: d, isLoading, isError, refetch } = useDecision(decisionId);
  const appealM = useCreateAppeal();
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState("");
  if (isLoading || !d) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4" data-testid="decision-loading">
        {isError ? <ErrorBox onRetry={() => refetch()}>{t("Chưa có kết quả. Hồ sơ của bạn được giữ, bạn thử lại nhé.")}</ErrorBox> : <p role="status" className="text-sm font-semibold text-ink">{t("Đang xem xét hồ sơ của bạn…")}</p>}
        <Card className="space-y-2"><Skel className="h-5 w-40" /><Skel /><Skel /></Card>
      </div>
    );
  }
  const appeal = d.appeal;
  const overturned = appeal?.status === "OVERTURNED" && appeal.newOffer;
  const approved = d.outcome === "APPROVED" || !!overturned;
  const counter = d.outcome === "COUNTER_OFFER" && !overturned;
  const pendingAppeal = appeal && !overturned && appeal.status !== "UPHELD";
  const tenor = d.tenorMonths ? t("{0} tháng", d.tenorMonths) : t(unit);
  const amount = overturned ? appeal!.newOffer!.amount : d.approvedAmount?.amount ?? 0;
  const canSign = approved || (counter && acceptCounter);
  const headline = overturned
    ? t("HLB đã duyệt lại: {0}", vnd(amount))
    : approved ? t("Đã được duyệt {0}", vnd(amount))
    : counter ? t("Bạn được duyệt {0}", vnd(amount))
    : t("Rất tiếc, hiện chưa thể duyệt khoản này");
  const sub = approved
    ? (overturned ? t("Ưu đãi có hiệu lực đến {0}.", dmyFull(appeal!.offerValidUntil ?? new Date().toISOString())) : terms ? t(terms) : tenor)
    : counter ? t("Thấp hơn số tiền bạn đề nghị ({0}).", vnd(d.requestedAmount?.amount ?? 0))
    : t("Bạn có thể chọn gói nhỏ hơn hoặc kết nối thêm dữ liệu. Thử lại sau 30 ngày.");
  const submitAppeal = async () => {
    try {
      await appealM.mutateAsync({ decisionId: d.decisionId, note: note.trim() || undefined });
      track("appeal_requested", { decisionId: d.decisionId, aiOutcome: d.outcome });
      setSheet(false);
    } catch { /* shown in the sheet */ }
  };
  return (
    <>
      <div className="flex flex-1 flex-col gap-3.5 p-4" data-testid="decision" data-outcome={d.outcome} data-appeal={appeal?.status ?? "NONE"}>
        <Card tone={approved ? "soft" : "outline"} className={approved ? "border border-primary text-center" : "text-center"}>
          <div className={`mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full text-2xl font-bold text-primary-foreground ${approved ? "bg-success" : "bg-warning"}`}>{approved ? "✓" : counter ? "≈" : "!"}</div>
          <h2 className="text-xl font-bold text-ink">{headline}</h2>
          <p className="mt-1 text-[13px] text-muted">{sub}</p>
        </Card>
        {pendingAppeal && (
          <Card tone="soft" className="space-y-1" role="status" data-testid="appeal-status">
            <div className="text-xs font-semibold text-primary">{t("Yêu cầu xem xét lại")} · {appeal!.referenceNo}</div>
            <p className="text-[13px] text-ink">{t("Đã gửi yêu cầu xem xét lại. Chuyên viên HLB sẽ trả lời trong vòng 2 ngày làm việc.")}</p>
            <p className="text-xs text-muted">{t("Hạn trả lời: {0}", dmyFull(appeal!.dueAt))}</p>
          </Card>
        )}
        {appeal?.status === "UPHELD" && <Card tone="outline" className="text-[13px]" data-testid="appeal-status">{t("HLB đã xem xét lại và giữ nguyên quyết định.")}</Card>}
        <Card className="space-y-2">
          <h3 className="text-[13px] font-semibold text-ink">{approved ? t("Vì sao được duyệt") : t("Lý do")}</h3>
          <p className="text-[13px] text-muted" data-testid="decision-reason">{overturned ? t("Chuyên viên HLB đã xem xét lại hồ sơ của bạn.") : tr(d.explanationText ?? "")}</p>
          {d.outcome === "APPROVED" && d.dataUsed.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label={t("Dữ liệu đã dùng")}>
              {d.dataUsed.map((s) => (
                <Chip key={s.sourceId}>{t(SOURCE_BY_ID[s.sourceId].name)} → {t(s.role)}</Chip>
              ))}
            </div>
          )}
        </Card>
        {d.nextRung && !overturned && (
          <Card tone="soft" className="space-y-1">
            <div className="text-xs font-semibold text-primary">{approved ? t("Bước tiếp theo") : t("Bạn có thể làm gì")}</div>
            <div className="text-[13px] text-ink">
              {approved
                ? t("Thêm {0} để mở khóa tới {1}", lc(t(d.nextRung.name ?? "")), vnd(d.nextRung.unlockLimit.amount))
                : t("Kết nối {0} (ưu tiên #{1}) để tăng hạn mức tới {2}.", lc(t(d.nextRung.name ?? "")), d.nextRung.rank ?? "", vnd(d.nextRung.unlockLimit.amount))}
            </div>
          </Card>
        )}
        {d.outcome === "DECLINED" && d.reasonCodes[0] === "STACKING_LIMIT" && <ErrorBox>{tr(d.explanationText ?? "")}</ErrorBox>}
      </div>
      <BottomBar>
        <Lockup />
        {canSign ? (
          <Btn onClick={onContinue}>{counter ? t("Tiếp tục với {0}", vnd(amount)) : t(continueLabel)}</Btn>
        ) : (
          <>
            {onSmaller && <Btn onClick={onSmaller}>{t("Chọn gói nhỏ hơn")}</Btn>}
            {onConnect && d.nextRung && <Btn variant="secondary" onClick={onConnect}>{t("Kết nối thêm dữ liệu")}</Btn>}
          </>
        )}
        {d.appealable && <Btn variant="secondary" data-testid="appeal-open" onClick={() => setSheet(true)}>{t("Yêu cầu HLB xem xét lại")}</Btn>}
        {!approved && onOther && <Btn variant="ghost" onClick={onOther}>{t("Chọn cách thanh toán khác")}</Btn>}
      </BottomBar>
      {sheet && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/45" role="dialog" aria-modal="true" aria-label={t("Yêu cầu xem xét lại")}>
          <div className="space-y-3 rounded-t-[20px] bg-card p-5 pb-6" data-testid="appeal-sheet">
            <h2 className="text-[17px] font-bold text-ink">{t("Yêu cầu HLB xem xét lại")}</h2>
            <p className="text-[13px] text-ink">{t("Một chuyên viên của Hong Leong Bank sẽ xem lại hồ sơ và trả lời bạn trong vòng 2 ngày làm việc. Quyết định hiện tại vẫn được giữ trong lúc chờ.")}</p>
            <label className="block space-y-1 text-[13px]">
              <span className="text-xs font-semibold text-muted">{t("Bạn muốn HLB biết thêm điều gì? (không bắt buộc)")}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-lg border border-line p-2.5" aria-label={t("Ghi chú cho chuyên viên")} />
            </label>
            {appealM.isError && <ErrorBox>{t("Chưa gửi được yêu cầu. Nội dung bạn nhập vẫn được giữ.")}</ErrorBox>}
            <Lockup />
            <Btn data-testid="appeal-submit" disabled={appealM.isPending} onClick={submitAppeal}>{appealM.isPending ? t("Đang gửi…") : t("Gửi yêu cầu")}</Btn>
            <Btn variant="secondary" onClick={() => setSheet(false)}>{t("Để sau")}</Btn>
          </div>
        </div>
      )}
    </>
  );
}
