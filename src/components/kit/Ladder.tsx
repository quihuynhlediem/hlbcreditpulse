"use client";
import { useLimitLadder } from "@/api/hooks";
import type { SourceId } from "@/api/types";
import { Btn, Card, ErrorBox, Skel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { vnd } from "@/lib/format";
import { SOURCE_BY_ID } from "@/mocks/fixtures";

/** Data-for-limit ladder (SCR-26, R-16): each rung names the data, its priority rank and what it unlocks. */
export function LadderView({ customerRef, ekycDone, onConnect, onVerify, heroLabel = "Hạn mức hiện tại" }: { customerRef: string; ekycDone?: boolean; onConnect: (s: SourceId) => void; onVerify?: () => void; heroLabel?: string }) {
  const { data, isLoading, isError, refetch } = useLimitLadder(customerRef);
  if (isError) return <div className="p-4"><ErrorBox onRetry={() => refetch()}>Chưa thể kết nối lúc này. Dữ liệu của bạn vẫn an toàn.</ErrorBox></div>;
  if (isLoading || !data) return <div className="space-y-3 p-4" aria-busy><Skel className="h-24" /><Skel className="h-14" /><Skel className="h-14" /><Skel className="h-14" /></div>;
  const rungIdx = data.rungs.findIndex((r) => r.rung === data.currentRung) + 1;
  return (
    <div className="flex flex-col gap-3 p-4" data-testid="ladder" data-rung={data.currentRung}>
      <Card tone="brand" className="space-y-1.5">
        <div className="text-xs">{ekycDone === false ? "Hạn mức khởi đầu" : heroLabel}</div>
        <div className="text-[28px] font-bold" data-testid="current-limit">{vnd(data.currentLimit.amount)}</div>
        <div className="text-[13px]">
          {ekycDone === false ? "Xác thực CCCD gắn chip để nhận hạn mức khởi đầu, rồi kết nối thêm dữ liệu để tăng." : `Bạn đang ở bước ${rungIdx}/${data.rungs.length}. Kết nối thêm dữ liệu để tăng hạn mức.`}
        </div>
      </Card>
      {data.rungs.map((r, i) => {
        const named = r.sources.filter((s) => !["B-01", "AD-02"].includes(s.sourceId));
        const first = named[0];
        const note = r.sources.find((s) => s.role.startsWith("Chưa đủ dữ liệu"));
        return (
          <div key={r.rung} className={cn("flex items-center gap-3 rounded-xl p-3", r.reached ? "bg-card" : "border border-line bg-card")} data-testid="rung" data-reached={r.reached}>
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold", r.reached ? "bg-success text-primary-foreground" : "bg-line text-muted")}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{first ? first.name : "Xác thực CCCD gắn chip"}</div>
              <div className="text-xs text-muted">{note ? note.role : first ? `Dữ liệu từ ${first.role.toLowerCase()}` : "Hạn mức khởi đầu"}</div>
            </div>
            <div className="text-right">
              <div className={cn("text-[13px] font-bold", r.reached ? "text-success" : "text-ink")}>{vnd(r.cap.amount)}</div>
              {first && <div className="text-[11px] font-medium text-primary">Ưu tiên {SOURCE_BY_ID[first.sourceId].rankLabel}</div>}
            </div>
          </div>
        );
      })}
      {data.cicState === "NO_FILE" && <Card tone="soft" className="text-xs text-ink">CIC: Chưa có hồ sơ — không ảnh hưởng đến bạn</Card>}
      {ekycDone === false && onVerify ? (
        <Btn onClick={onVerify}>Xác thực CCCD</Btn>
      ) : data.nextSuggestion ? (
        <Card tone="soft" className="space-y-2" data-testid="next-suggestion">
          <div className="text-[13px] font-semibold text-ink">Gợi ý tiếp theo: {data.nextSuggestion.name?.toLowerCase()} (ưu tiên #{data.nextSuggestion.rank}) → mở khóa tới {vnd(data.nextSuggestion.unlockLimit.amount)}</div>
          <Btn onClick={() => onConnect(data.nextSuggestion!.sourceId)}>Kết nối {data.nextSuggestion.name?.toLowerCase()}</Btn>
        </Card>
      ) : null}
    </div>
  );
}
