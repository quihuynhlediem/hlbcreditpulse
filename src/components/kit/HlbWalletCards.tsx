"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCreatePrescreen } from "@/api/hooks";
import { track } from "@/api/track";
import { Btn, Card, Lockup } from "@/components/ui";
import { useT } from "@/i18n";
import { vnd } from "@/lib/format";
import { nextDue, useProductLoan } from "@/lib/useLoan";
import { useWallet } from "@/lib/wallet";
import { useFlow } from "@/store/flow";

/** HLB entry components on a wallet home (SCR-20, SCR-40, SCR-50): the pre-approved banner and the active-loan card. */
export function HlbWalletCards() {
  const t = useT();
  const router = useRouter();
  const w = useWallet();
  const persona = useFlow((s) => s.persona);
  const pre = useCreatePrescreen();
  const { loan } = useProductLoan(persona, "PAYMENT_INSTALLMENT");
  const { mutate } = pre;
  useEffect(() => { mutate({ partnerId: w.partnerId, hashedCustomerId: `h_${persona}` }, { onSuccess: (r) => { if (r.eligible) track("prescreen_offer_shown", { partnerId: w.partnerId, rung: r.rung }); } }); }, [persona, w.partnerId, mutate]);
  const due = nextDue(loan);
  return (
    <>
      {pre.data?.eligible && pre.data.bandMax && (
        <Card tone="soft" className="space-y-2 border border-primary" data-testid="hlb-banner">
          <div className="text-xs font-semibold text-primary">{t("Trả góp HLB")}</div>
          <div className="text-base font-bold">{t("Bạn đã có hạn mức trả góp HLB tới {0}", vnd(pre.data.bandMax.amount))}</div>
          <p className="text-[13px] text-muted">{t("Dùng ngay khi thanh toán tại các sàn thương mại điện tử.")}</p>
          <Lockup />
          <Btn onClick={() => router.push("/shopee/checkout")}>{t("Dùng ngay")}</Btn>
        </Card>
      )}
      {loan && due && (
        <Link href={`${w.base}/loans`} className="block" data-testid="active-loan-card">
          <Card tone="outline" className="space-y-1"><div className="text-xs text-muted">{t("Khoản trả góp HLB")}</div><div className="text-sm font-bold">{t("Kỳ tới {0}", `${due.dueDate.slice(8)}/${due.dueDate.slice(5, 7)}`)} · {vnd(due.amount.amount)}</div></Card>
        </Link>
      )}
      <div className="flex gap-3 text-[13px] font-semibold text-primary">
        <Link href={`${w.base}/limit?from=hub`} data-testid="open-limit-hub">{t("Hạn mức trả góp HLB")} ›</Link>
        <Link href={`${w.base}/privacy`}>{t("Quyền riêng tư và dữ liệu")} ›</Link>
      </div>
    </>
  );
}
