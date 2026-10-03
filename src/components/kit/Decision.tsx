"use client";
import { useDecision } from "@/api/hooks";
import { Btn, Card, Chip, ErrorBox, Lockup, Skel } from "@/components/ui";
import { vnd } from "@/lib/format";
import { SOURCE_BY_ID } from "@/mocks/fixtures";
import { BottomBar } from "./PhoneShell";

/** Decision screen (SCR-27, 45, 56): approved with reasons, declined with a path, or manual review. Never shows a score. */
export function DecisionView({ decisionId, unit = "6 tháng", terms, onContinue, onSmaller, onOther, onConnect, continueLabel = "Tiếp tục ký hợp đồng" }: {
  decisionId?: string;
  unit?: string;
  terms?: string;
  onContinue: () => void;
  onSmaller?: () => void;
  onOther?: () => void;
  onConnect?: () => void;
  continueLabel?: string;
}) {
  const { data: d, isLoading, isError, refetch } = useDecision(decisionId);
  if (isLoading || !d) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4" data-testid="decision-loading">
        {isError ? <ErrorBox onRetry={() => refetch()}>Chưa có kết quả. Hồ sơ của bạn được giữ, bạn thử lại nhé.</ErrorBox> : <p role="status" className="text-sm font-semibold text-ink">Đang xem xét hồ sơ của bạn…</p>}
        <Card className="space-y-2"><Skel className="h-5 w-40" /><Skel /><Skel /></Card>
      </div>
    );
  }
  const approved = d.outcome === "APPROVED";
  const manual = d.outcome === "MANUAL_REVIEW";
  const tenor = d.tenorMonths ? `${d.tenorMonths} tháng` : unit;
  return (
    <>
      <div className="flex flex-1 flex-col gap-3.5 p-4" data-testid="decision" data-outcome={d.outcome}>
        <Card tone={approved ? "soft" : "outline"} className={approved ? "border border-primary text-center" : "text-center"}>
          <div className={`mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full text-2xl font-bold text-primary-foreground ${approved ? "bg-success" : "bg-warning"}`}>{approved ? "✓" : manual ? "…" : "!"}</div>
          <h2 className="text-xl font-bold text-ink">
            {approved ? `Đã được duyệt ${vnd(d.approvedAmount?.amount ?? 0)}` : manual ? "Hồ sơ cần xem thêm" : "Rất tiếc, hiện chưa thể duyệt khoản này"}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {approved ? terms ?? `${tenor}${d.approvedAmount ? "" : ""}` : manual ? "Chúng tôi sẽ báo kết quả trong vòng 4 giờ làm việc." : "Bạn có thể chọn gói nhỏ hơn hoặc kết nối thêm dữ liệu. Thử lại sau 30 ngày."}
          </p>
        </Card>
        <Card className="space-y-2">
          <h3 className="text-[13px] font-semibold text-ink">{approved ? "Vì sao được duyệt" : manual ? "Vì sao cần xem thêm" : "Lý do"}</h3>
          <p className="text-[13px] text-muted" data-testid="decision-reason">{d.explanationText}</p>
          {approved && d.dataUsed.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Dữ liệu đã dùng">
              {d.dataUsed.map((s) => (
                <Chip key={s.sourceId}>{SOURCE_BY_ID[s.sourceId].name} → {s.role}</Chip>
              ))}
            </div>
          )}
        </Card>
        {d.nextRung && (
          <Card tone="soft" className="space-y-1">
            <div className="text-xs font-semibold text-primary">{approved ? "Bước tiếp theo" : "Bạn có thể làm gì"}</div>
            <div className="text-[13px] text-ink">
              {approved ? `Thêm ${d.nextRung.name?.toLowerCase()} để mở khóa tới ${vnd(d.nextRung.unlockLimit.amount)}` : `Kết nối ${d.nextRung.name?.toLowerCase()} (ưu tiên #${d.nextRung.rank}) để tăng hạn mức tới ${vnd(d.nextRung.unlockLimit.amount)}.`}
            </div>
          </Card>
        )}
        {!approved && !manual && d.reasonCodes[0] === "STACKING_LIMIT" && <ErrorBox>{d.explanationText}</ErrorBox>}
      </div>
      <BottomBar>
        <Lockup />
        {approved ? (
          <Btn onClick={onContinue}>{continueLabel}</Btn>
        ) : manual ? (
          <Btn variant="secondary" onClick={onOther ?? onContinue}>Đã hiểu</Btn>
        ) : (
          <>
            {onSmaller && <Btn onClick={onSmaller}>Chọn gói nhỏ hơn</Btn>}
            {onConnect && d.nextRung && <Btn variant="secondary" onClick={onConnect}>Kết nối thêm dữ liệu</Btn>}
            {onOther && <Btn variant="secondary" onClick={onOther}>Chọn cách thanh toán khác</Btn>}
          </>
        )}
      </BottomBar>
    </>
  );
}
