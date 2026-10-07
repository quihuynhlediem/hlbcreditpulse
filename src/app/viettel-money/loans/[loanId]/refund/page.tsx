"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLoans } from "@/api/hooks";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useWallet } from "@/lib/wallet";
import { Btn, Card, ErrorBox, KV, Skel } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";
import { useT, tKey } from "@/i18n";

/** SCR-30 refund and dispute status: principal reduced, due date paused up to 30 days, no adverse CIC. */
function Refund() {
  const w = useWallet();
  const B = w.base;
  const t = useT();
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
    <WalletFrame scr="SCR-30" title={tKey("Hoàn trả đơn hàng")} back={`${B}/loans`} footer={<><Btn onClick={() => router.push(`${B}/loans`)}>{t("Xem lịch trả mới")}</Btn><Btn variant="secondary">{t("Liên hệ hỗ trợ")}</Btn></>}>
      <div className="flex flex-col gap-3 p-4" data-testid="refund-status">
        {isError && <ErrorBox onRetry={() => refetch()}>{t("Chưa cập nhật được. Chúng tôi sẽ thử lại và báo bạn.")}</ErrorBox>}
        {isLoading && <Skel className="h-24" />}
        {!isLoading && !loan && <Card className="text-sm">{t("Chưa có yêu cầu hoàn trả nào.")}</Card>}
        {loan && (
          <>
            {rejected ? (
              <Card tone="soft" className="space-y-1.5 border border-primary">
                <h2 className="text-lg font-bold">{t("Lịch trả được giữ nguyên")}</h2>
                <p className="text-[13px] text-muted">{t("Người bán đã từ chối yêu cầu trả hàng, nên khoản trả góp của bạn không thay đổi.")}</p>
              </Card>
            ) : (
              <Card tone="soft" className="space-y-1.5 border border-primary">
                <h2 className="text-lg font-bold">{amt ? t("Đã giảm dư nợ {0}", vnd(amt)) : t("Đã cập nhật dư nợ")}</h2>
                <p className="text-[13px] text-muted">{t("Kỳ tới dời sang {0}. Trong thời gian này không có thông tin xấu gửi CIC.", loan.pauseUntil ? loan.pauseUntil.slice(8) + "/" + loan.pauseUntil.slice(5, 7) : "—")}</p>
              </Card>
            )}
            <Card className="space-y-2">
              <KV k={t("Dư nợ mới")} v={vnd(loan.principalRemaining.amount)} bold />
              <KV k={t("Kỳ tạm hoãn đến")} v={loan.pauseUntil ?? "—"} />
              <KV k={t("Lịch trả mới")} v={next ? t("Kỳ tới {0}", vnd(next.amount.amount)) : t("Đã cập nhật")} />
              <KV k={t("Tổng còn phải trả")} v={vnd(loan.totalRemaining.amount)} />
            </Card>
          </>
        )}
      </div>
    </WalletFrame>
  );
}
export default function Page() { return <Suspense><Refund /></Suspense>; }
