"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLoans } from "@/api/hooks";
import { VmFrame } from "@/components/vm/VmFrame";
import { Btn, Card, ErrorBox, KV, Skel } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";

/** SCR-30 refund and dispute status: principal reduced, due date paused up to 30 days, no adverse CIC. */
function Refund() {
  const { loanId } = useParams<{ loanId: string }>();
  const q = useSearchParams();
  const amt = Number(q.get("amt") ?? 0);
  const rejected = q.get("rejected") === "1";
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const { data, isLoading, isError, refetch } = useLoans(persona);
  const loan = data?.find((l) => l.loanId === loanId);
  const next = loan?.schedule.find((s) => s.status === "PAUSED" || s.status === "DUE");
  return (
    <VmFrame scr="SCR-30" title="Hoàn trả đơn hàng" back="/viettel-money/loans" footer={<><Btn onClick={() => router.push("/viettel-money/loans")}>Xem lịch trả mới</Btn><Btn variant="secondary">Liên hệ hỗ trợ</Btn></>}>
      <div className="flex flex-col gap-3 p-4" data-testid="refund-status">
        {isError && <ErrorBox onRetry={() => refetch()}>Chưa cập nhật được. Chúng tôi sẽ thử lại và báo bạn.</ErrorBox>}
        {isLoading && <Skel className="h-24" />}
        {!isLoading && !loan && <Card className="text-sm">Chưa có yêu cầu hoàn trả nào.</Card>}
        {loan && (
          <>
            {rejected ? (
              <Card tone="soft" className="space-y-1.5 border border-primary">
                <h2 className="text-lg font-bold">Lịch trả được giữ nguyên</h2>
                <p className="text-[13px] text-muted">Người bán đã từ chối yêu cầu trả hàng, nên khoản trả góp của bạn không thay đổi.</p>
              </Card>
            ) : (
              <Card tone="soft" className="space-y-1.5 border border-primary">
                <h2 className="text-lg font-bold">{amt ? `Đã giảm dư nợ ${vnd(amt)}` : "Đã cập nhật dư nợ"}</h2>
                <p className="text-[13px] text-muted">Kỳ tới dời sang {loan.pauseUntil ? loan.pauseUntil.slice(8) + "/" + loan.pauseUntil.slice(5, 7) : "—"}. Trong thời gian này không có thông tin xấu gửi CIC.</p>
              </Card>
            )}
            <Card className="space-y-2">
              <KV k="Dư nợ mới" v={vnd(loan.principalRemaining.amount)} bold />
              <KV k="Kỳ tạm hoãn đến" v={loan.pauseUntil ?? "—"} />
              <KV k="Lịch trả mới" v={next ? `Kỳ tới ${vnd(next.amount.amount)}` : "Đã cập nhật"} />
              <KV k="Tổng còn phải trả" v={vnd(loan.totalRemaining.amount)} />
            </Card>
          </>
        )}
      </div>
    </VmFrame>
  );
}
export default function Page() { return <Suspense><Refund /></Suspense>; }
