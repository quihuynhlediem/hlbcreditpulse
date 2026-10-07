"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOfferSet } from "@/api/hooks";
import { track } from "@/api/track";
import type { Package } from "@/api/types";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useWallet, useOrder } from "@/lib/wallet";
import { Btn, Card, Chip, ErrorBox, KV, Lockup, Skel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { eirText, vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";
import { tr, useT, tKey } from "@/i18n";

function CostSheet({ pkg, principal, onClose }: { pkg: Package; principal: number; onClose: () => void }) {
  const t = useT();
  const interest = pkg.totalPayable.amount - principal;
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/45" role="dialog" aria-modal="true" aria-label={t("Chi phí chi tiết")}>
      <div className="space-y-2.5 rounded-t-[20px] bg-card p-5 pb-6" data-testid="cost-sheet">
        <h2 className="text-lg font-bold">{t("Chi phí chi tiết · gói {0} tháng", pkg.tenorMonths)}</h2>
        <KV k={t("Số tiền vay (gốc)")} v={vnd(principal)} />
        <KV k={t("Lãi")} v={pkg.interestPayer === "MERCHANT" ? t("0 ₫ (người bán chịu)") : vnd(interest)} />
        <KV k={t("Phí hồ sơ")} v="0 ₫" />
        <KV k={t("Phí bảo hiểm")} v={t("Không bắt buộc")} />
        <KV k={t("Tổng số tiền phải trả")} v={vnd(pkg.totalPayable.amount)} bold />
        <KV k={t("Lãi suất hiệu dụng (EIR)")} v={eirText(pkg.eir)} bold />
        <KV k={t("Mỗi tháng")} v={t("{0} × {1} kỳ", vnd(pkg.monthlyInstalment.amount), pkg.tenorMonths)} />
        <p className="rounded-xl bg-primary-soft p-3 text-xs">{t("Tất toán sớm: không phí ẩn. Bạn chỉ trả phần lãi đến ngày tất toán.")}</p>
        <Lockup />
        <Btn variant="secondary" onClick={onClose}>{t("Đóng")}</Btn>
      </div>
    </div>
  );
}

/** SCR-22 installment offers with total VND and EIR on every card (G-3). */
export default function Offers() {
  const w = useWallet();
  const B = w.base;
  const t = useT();
  const order = useOrder();
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
    <WalletFrame
      scr="SCR-22" title={tKey("Chọn gói trả góp")} back={() => router.push("/shopee/checkout")}
      footer={
        <>
          <Lockup />
          {anyAvail ? (
            <Btn data-testid="choose-package" disabled={!chosen} onClick={() => { set({ packageId: chosen!.packageId }); track("offer_selected", { packageId: chosen!.packageId }); track("application_started", { offerRequestId }); router.push(`${B}/decision/new`); }}>
              {chosen ? t("Chọn gói {0} tháng", chosen.tenorMonths) : t("Chọn gói")}
            </Btn>
          ) : (
            <Btn onClick={() => router.push(`${B}/limit?offer=${offerRequestId}`)}>{t("Mở khóa hạn mức")}</Btn>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3 p-4" data-testid="offers">
        <Card className="space-y-1"><div className="text-xs text-muted">{t("Đơn hàng Shopee")} · {order.shop}</div><div className="flex justify-between text-sm"><span className="font-medium">{order.short}</span><span className="font-bold">{vnd(orderAmount)}</span></div></Card>
        {isError && <ErrorBox onRetry={() => refetch()}>{t("Chưa thể tải gói trả góp lúc này. Đơn hàng của bạn vẫn được giữ.")}</ErrorBox>}
        {(isLoading || !data) && !isError && [0, 1, 2].map((i) => <Card key={i} className="space-y-2.5"><Skel className="h-[18px] w-28" /><Skel /><Skel /></Card>)}
        {data && (
          <>
            <Card tone="soft" className="space-y-1.5" data-testid="limit-card">
              <div className="flex justify-between text-xs"><span className="text-muted">{t("Hạn mức hiện tại")}</span><span className="text-sm font-bold text-primary" data-testid="offer-limit">{vnd(limit)}</span></div>
              <div className="h-2 overflow-hidden rounded bg-card"><div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, Math.round((limit / Math.max(orderAmount, limit)) * 100))}%` }} /></div>
              {!anyAvail && <p className="text-xs text-ink">{t("Đơn hàng {0} cần mở khóa thêm.", vnd(orderAmount))}</p>}
            </Card>
            {!anyAvail && <p className="text-[13px] text-ink" data-testid="no-package">{t("Hiện chưa có gói phù hợp cho đơn này. Mở khóa hạn mức để xem gói trả góp.")}</p>}
            {data.packages.map((p) => (
              <div key={p.packageId} className={cn("w-full space-y-2 rounded-2xl border-2 bg-card p-3.5 text-left", sel === p.packageId && p.available ? "border-primary" : "border-line", !p.available && "opacity-60")} data-testid="package-card" data-package={p.packageId} data-available={p.available}>
                <button className="w-full space-y-2 text-left disabled:cursor-not-allowed" disabled={!p.available} aria-pressed={sel === p.packageId} onClick={() => setSel(p.packageId)}>
                  <div className="flex items-center justify-between"><span className="text-base font-bold">{t("{0} tháng", p.tenorMonths)}</span>{p.eir === 0 && <Chip>{t("0% lãi")}</Chip>}</div>
                  <KV k={t("Mỗi tháng")} v={vnd(p.monthlyInstalment.amount)} bold />
                  <KV k={t("Tổng số tiền phải trả")} v={vnd(p.totalPayable.amount)} />
                  <KV k={t("Lãi suất hiệu dụng (EIR)")} v={p.eir === 0 ? t("0% (người bán chịu)") : eirText(p.eir)} />
                  {!p.available && <p className="text-xs font-semibold text-warning">{tr(p.disabledReason ?? "")}</p>}
                </button>
                <button className="text-xs font-semibold text-primary" onClick={() => setDetail(p)}>{t("Chi phí chi tiết")}</button>
              </div>
            ))}
            {anyAvail && data.packages.some((p) => !p.available) && <button className="text-left text-[13px] font-semibold text-primary" onClick={() => router.push(`${B}/limit?offer=${offerRequestId}`)}>{t("Mở khóa hạn mức")}</button>}
          </>
        )}
      </div>
      {detail && <CostSheet pkg={detail} principal={orderAmount} onClose={() => setDetail(null)} />}
    </WalletFrame>
  );
}
