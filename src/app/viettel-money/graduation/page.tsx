"use client";
import { useRouter } from "next/navigation";
import { track } from "@/api/track";
import { useGraduation } from "@/api/hooks";
import { VmFrame } from "@/components/vm/VmFrame";
import { Btn, Card, ErrorBox, Lockup, Skel } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";

/** SCR-31 graduation: higher limit, HLB card via the wallet, merchant-led referral only (no cash reward, D-11, D-31). */
export default function Graduation() {
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const { data, isLoading, isError, refetch } = useGraduation(persona);
  const has = data && data.newLimit.amount > 0;
  return (
    <VmFrame scr="SCR-31" title="Ưu đãi dành cho bạn" back="/viettel-money" footer={has ? <><Lockup /><Btn onClick={() => { track("graduation_accepted", { limit: data!.newLimit.amount }); router.push("/viettel-money/limit?from=hub"); }}>Nâng hạn mức</Btn><Btn variant="secondary" onClick={() => router.push("/viettel-money")}>Để sau</Btn></> : undefined}>
      <div className="flex flex-col gap-3 p-4" data-testid="graduation">
        {isError && <ErrorBox onRetry={() => refetch()}>Chưa thể kết nối lúc này.</ErrorBox>}
        {isLoading && <Skel className="h-24" />}
        {data && !has && <Card className="text-center text-sm">Chưa có ưu đãi mới. Trả đúng hạn 3 kỳ để nâng hạn mức.</Card>}
        {has && data && (
          <>
            <Card tone="brand" className="space-y-1"><div className="text-[13px]">Bạn trả đúng hạn 3 kỳ</div><div className="text-2xl font-bold">Hạn mức mới {vnd(data.newLimit.amount)}</div></Card>
            {data.productOffers?.includes("HLB_CARD") && <Card className="space-y-2"><h2 className="text-sm font-semibold">Thẻ HLB</h2><p className="text-xs text-muted">Mở thẻ HLB với hạn mức khởi đầu dựa trên lịch sử trả nợ của bạn.</p><Btn variant="secondary">Tìm hiểu thẻ HLB</Btn></Card>}
            {data.merchantCode && <Card tone="soft" className="space-y-1"><div className="text-[13px] font-semibold">Mã giảm giá từ người bán: {data.merchantCode}</div><p className="text-xs text-muted">Dùng cho lần mua tiếp theo. Không có thưởng tiền mặt.</p></Card>}
          </>
        )}
      </div>
    </VmFrame>
  );
}
