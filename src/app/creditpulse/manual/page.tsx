"use client";
import { useState } from "react";
import { useManualQueue, useResolveManual } from "@/api/hooks";
import { ConsoleFrame } from "@/components/console/ConsoleFrame";
import { Btn, Card, Chip, ErrorBox, Skel } from "@/components/ui";
import Link from "next/link";

const REASONS = [["DOC_CONFIRMED", "Đã xác nhận giấy tờ"], ["INCOME_VERIFIED", "Đã xác minh thu nhập"], ["RISK_TOO_HIGH", "Rủi ro cao"], ["INCONSISTENT_DATA", "Dữ liệu không nhất quán"]] as const;

/** SCR-63 manual tier queue: SLA, suggested action, approve or decline with a reason code. */
export default function Manual() {
  const { data, isLoading, isError, refetch } = useManualQueue();
  const resolve = useResolveManual();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [now] = useState(() => Date.now());
  const open = data?.filter((c) => c.status === "OPEN") ?? [];
  const done = data?.filter((c) => c.status === "RESOLVED") ?? [];
  return (
    <ConsoleFrame scr="SCR-63" title="Hàng chờ xem xét thủ công" subtitle="Hồ sơ cần thêm bằng chứng. Cam kết phản hồi trong 4 giờ làm việc.">
      {isError ? <ErrorBox onRetry={() => refetch()}>Không tải được hàng chờ.</ErrorBox> : isLoading ? <Skel className="h-32" /> : open.length === 0 && done.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="empty">Hàng chờ trống.</p> : (
        <div className="space-y-3">
          {open.map((c) => {
            const overdue = new Date(c.slaDueAt).getTime() < now;
            const hours = Math.round((new Date(c.slaDueAt).getTime() - now) / 3_600_000);
            const rc = reason[c.caseId] ?? REASONS[0][0];
            return (
              <Card key={c.caseId} className={`space-y-2 ${overdue ? "border border-danger" : ""}`} data-testid="manual-case" data-overdue={overdue}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/creditpulse/decisions/${c.decisionId}`} className="text-sm font-bold text-primary underline">Hồ sơ {c.caseId.slice(0, 8)}</Link>
                  {overdue ? <Chip tone="warning">Quá hạn SLA</Chip> : <Chip tone="muted">Còn {hours} giờ</Chip>}
                </div>
                <p className="text-[13px]"><span className="font-semibold">Gợi ý: </span>{c.suggestedAction}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label="Mã lý do" value={rc} onChange={(e) => setReason({ ...reason, [c.caseId]: e.target.value })} className="rounded-lg border border-line bg-card px-2 py-1.5 text-[13px]">{REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <Btn className="!w-auto px-4 py-2 text-[13px]" disabled={resolve.isPending} onClick={() => resolve.mutate({ caseId: c.caseId, action: "APPROVE", reasonCode: rc })}>Duyệt</Btn>
                  <Btn variant="danger" className="!w-auto px-4 py-2 text-[13px]" disabled={resolve.isPending} onClick={() => resolve.mutate({ caseId: c.caseId, action: "DECLINE", reasonCode: rc })}>Từ chối</Btn>
                </div>
              </Card>
            );
          })}
          {open.length === 0 && <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="empty">Hàng chờ trống.</p>}
          {done.length > 0 && <p className="text-xs text-muted" data-testid="resolved-count">Đã xử lý: {done.length} hồ sơ</p>}
        </div>
      )}
    </ConsoleFrame>
  );
}
