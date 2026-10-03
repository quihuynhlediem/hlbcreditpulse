"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCreatePrescreen } from "@/api/hooks";
import { track } from "@/api/track";
import { Skel } from "@/components/ui";
import { useProductLoan, nextDue } from "@/lib/useLoan";
import { vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";

/** Pre-approval tile owned by the partner: eligible / locked / active loan states (SCR-40, SCR-41). */
export function LoanTile({ base, activePath, product, partnerId, label, eligibleText, activeLabel, lockedFallback, variant = "tile" }: {
  base: string; activePath: string; product: "DRIVER_INSTANT_LOAN" | "SELLER_FUNDING"; partnerId: "grab" | "so-ban-hang"; label: string;
  eligibleText: (max: string) => string; activeLabel: string; lockedFallback: string; variant?: "tile" | "banner";
}) {
  const router = useRouter();
  const { persona } = useFlow();
  const pre = useCreatePrescreen();
  const { loan, isLoading } = useProductLoan(persona, product);
  const { mutate } = pre;
  useEffect(() => { mutate({ partnerId, hashedCustomerId: `h_${persona}` }, { onSuccess: (r) => { if (r.eligible) track("prescreen_offer_shown", { partnerId, rung: r.rung }); } }); }, [persona, partnerId, mutate]);
  const r = pre.data;
  const loading = isLoading || pre.isPending || !r;
  const go = (to: string) => () => router.push(to);
  const cls = variant === "tile" ? "w-full rounded-2xl border border-primary bg-primary-soft p-3.5 text-left" : "w-full rounded-xl bg-primary p-3.5 text-left text-primary-foreground";
  if (loading) return <Skel className="h-[72px]" />;
  if (loan && loan.status === "ACTIVE") {
    const due = nextDue(loan);
    return (
      <button data-testid="loan-tile" data-state="active" className={cls} onClick={go(activePath)}>
        <div className="text-[13px] font-bold">{activeLabel} · {vnd(loan.totalRemaining.amount)}</div>
        <div className="text-xs">{due ? (due.amount.amount === 0 ? "Kỳ này: 0 ₫ (tuần không có thu nhập)" : `Kỳ tới ${vnd(due.amount.amount)}`) : "Xem lịch trả"}</div>
      </button>
    );
  }
  if (!r.eligible) {
    return (
      <div data-testid="loan-tile" data-state="locked" className="w-full rounded-2xl border border-line bg-card p-3.5 text-left" role="group" aria-label={label}>
        <div className="text-[13px] font-bold text-ink">{label}</div>
        <div className="text-xs text-muted">{r.reason ?? lockedFallback}</div>
      </div>
    );
  }
  return (
    <button data-testid="loan-tile" data-state="eligible" className={cls} onClick={go(`${base}/loan/offer`)}>
      <div className="text-[13px] font-bold">{eligibleText(vnd(r.bandMax?.amount ?? 0))}</div>
      <div className="text-xs">Xem điều kiện và vay trong vài phút</div>
    </button>
  );
}
