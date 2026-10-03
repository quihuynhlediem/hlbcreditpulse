"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOfferSet } from "@/api/hooks";
import { track } from "@/api/track";
import type { Package } from "@/api/types";
import { VmFrame } from "@/components/vm/VmFrame";
import { Btn, Card, Chip, ErrorBox, KV, Lockup, Skel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { eirText, vnd } from "@/lib/format";
import { DEFAULT_ORDER, useFlow } from "@/store/flow";

function CostSheet({ pkg, principal, onClose }: { pkg: Package; principal: number; onClose: () => void }) {
  const interest = pkg.totalPayable.amount - principal;
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="Chi phí chi tiết">
      <div className="space-y-2.5 rounded-t-[20px] bg-card p-5 pb-6" data-testid="cost-sheet">
        <h2 className="text-lg font-bold">Chi phí chi tiết · gói {pkg.tenorMonths} tháng</h2>
        <KV k="Số tiền vay (gốc)" v={vnd(principal)} />
        <KV k="Lãi" v={pkg.interestPayer === "MERCHANT" ? "0 ₫ (người bán chịu)" : vnd(interest)} />
        <KV k="Phí hồ sơ" v="0 ₫" />
        <KV k="Phí bảo hiểm" v="Không bắt buộc" />
        <KV k="Tổng số tiền phải trả" v={vnd(pkg.totalPayable.amount)} bold />
        <KV k="Lãi suất hiệu dụng (EIR)" v={eirText(pkg.eir)} bold />
        <KV k="Mỗi tháng" v={`${vnd(pkg.monthlyInstalment.amount)} × ${pkg.tenorMonths} kỳ`} />
        <p className="rounded-xl bg-primary-soft p-3 text-xs">Tất toán sớm: không phí ẩn. Bạn chỉ trả phần lãi đến ngày tất toán.</p>
        <Lockup />
        <Btn variant="secondary" onClick={onClose}>Đóng</Btn>
      </div>
    </div>
  );
}

/** SCR-22 installment offers with total VND and EIR on every card (G-3). */
export default function Offers() {
  const { offerRequestId } = useParams<{ offerRequestId: string }>();
  const router = useRouter();
  const { orderAmount, set } = useFlow();
  const { data, isLoading, isError, refetch } = useOfferSet(offerRequestId);
  const [sel, setSel] = useState<string | undefined>();
  const [detail, setDetail] = useState<Package | null>(null);
  const first = data?.packages.find((p) => p.available)?.packageId;
  useEffect(() => { if (!sel && first) setSel(first); }, [first, sel]); // eslint-disable-line react-hooks/set-state-in-effect
  const anyAvail = !!data?.packages.some((p) => p.available);
  const limit = data?.limit.amount ?? 0;
  const chosen = data?.packages.find((p) => p.packageId === sel);

  return (
    <VmFrame
      scr="SCR-22" title="Chọn gói trả góp" back={() => router.push("/shopee/checkout")}
      footer={
        <>
          <Lockup />
          {anyAvail ? (
            <Btn data-testid="choose-package" disabled={!chosen} onClick={() => { set({ packageId: chosen!.packageId }); track("offer_selected", { packageId: chosen!.packageId }); track("application_started", { offerRequestId }); router.push("/viettel-money/decision/new"); }}>
              {chosen ? `Chọn gói ${chosen.tenorMonths} tháng` : "Chọn gói"}
            </Btn>
          ) : (
            <Btn onClick={() => router.push(`/viettel-money/limit?offer=${offerRequestId}`)}>Mở khóa hạn mức</Btn>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3 p-4" data-testid="offers">
        <Card className="space-y-1"><div className="text-xs text-muted">Đơn hàng Shopee · {DEFAULT_ORDER.shop}</div><div className="flex justify-between text-sm"><span className="font-medium">{DEFAULT_ORDER.short}</span><span className="font-bold">{vnd(orderAmount)}</span></div></Card>
        {isError && <ErrorBox onRetry={() => refetch()}>Chưa thể tải gói trả góp lúc này. Đơn hàng của bạn vẫn được giữ.</ErrorBox>}
        {(isLoading || !data) && !isError && [0, 1, 2].map((i) => <Card key={i} className="space-y-2.5"><Skel className="h-[18px] w-28" /><Skel /><Skel /></Card>)}
        {data && (
          <>
            <Card tone="soft" className="space-y-1.5" data-testid="limit-card">
              <div className="flex justify-between text-xs"><span className="text-muted">Hạn mức hiện tại</span><span className="text-sm font-bold text-primary" data-testid="offer-limit">{vnd(limit)}</span></div>
              <div className="h-2 overflow-hidden rounded bg-card"><div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, Math.round((limit / Math.max(orderAmount, limit)) * 100))}%` }} /></div>
              {!anyAvail && <p className="text-xs text-ink">Đơn hàng {vnd(orderAmount)} cần mở khóa thêm.</p>}
            </Card>
            {!anyAvail && <p className="text-[13px] text-ink" data-testid="no-package">Hiện chưa có gói phù hợp cho đơn này. Mở khóa hạn mức để xem gói trả góp.</p>}
            {data.packages.map((p) => (
              <div key={p.packageId} className={cn("w-full space-y-2 rounded-2xl border-2 bg-card p-3.5 text-left", sel === p.packageId && p.available ? "border-primary" : "border-line", !p.available && "opacity-60")} data-testid="package-card" data-package={p.packageId} data-available={p.available}>
                <button className="w-full space-y-2 text-left disabled:cursor-not-allowed" disabled={!p.available} aria-pressed={sel === p.packageId} onClick={() => setSel(p.packageId)}>
                  <div className="flex items-center justify-between"><span className="text-base font-bold">{p.tenorMonths} tháng</span>{p.eir === 0 && <Chip>0% lãi</Chip>}</div>
                  <KV k="Mỗi tháng" v={vnd(p.monthlyInstalment.amount)} bold />
                  <KV k="Tổng số tiền phải trả" v={vnd(p.totalPayable.amount)} />
                  <KV k="Lãi suất hiệu dụng (EIR)" v={p.eir === 0 ? "0% (người bán chịu)" : eirText(p.eir)} />
                  {!p.available && <p className="text-xs font-semibold text-warning">{p.disabledReason}</p>}
                </button>
                <button className="text-xs font-semibold text-primary" onClick={() => setDetail(p)}>Chi phí chi tiết</button>
              </div>
            ))}
            {anyAvail && data.packages.some((p) => !p.available) && <button className="text-left text-[13px] font-semibold text-primary" onClick={() => router.push(`/viettel-money/limit?offer=${offerRequestId}`)}>Mở khóa hạn mức</button>}
          </>
        )}
      </div>
      {detail && <CostSheet pkg={detail} principal={orderAmount} onClose={() => setDetail(null)} />}
    </VmFrame>
  );
}
