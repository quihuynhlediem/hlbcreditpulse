"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreatePayment, useSettlementQuote } from "@/api/hooks";
import { track } from "@/api/track";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useWallet } from "@/lib/wallet";
import { Btn, Card, ErrorBox, KV, Lockup, Skel } from "@/components/ui";
import { eirText, vnd } from "@/lib/format";
import { nextDue, paidCount, useProductLoan } from "@/lib/useLoan";
import { useFlow } from "@/store/flow";
import { useT, tKey } from "@/i18n";

/** SCR-29 my installment loans: schedule, repay, early-settlement quote, late notice. */
export default function Loans() {
  const w = useWallet();
  const B = w.base;
  const t = useT();
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const { loan, isLoading, isError, refetch } = useProductLoan(persona, "PAYMENT_INSTALLMENT");
  const pay = useCreatePayment();
  const [quoteOn, setQuoteOn] = useState(false);
  const quote = useSettlementQuote(loan?.loanId, quoteOn);
  const due = nextDue(loan);
  const late = due && new Date(due.dueDate) < new Date(new Date().toDateString());
  return (
    <WalletFrame scr="SCR-29" title={tKey("Khoản trả góp")} back={`${B}`} footer={loan && due ? <><Lockup /><Btn disabled={pay.isPending} onClick={async () => { await pay.mutateAsync({ loanId: loan.loanId, amount: due.amount }); track("repayment_recorded", { loanId: loan.loanId }); }}>{pay.isPending ? t("Đang thanh toán…") : t("Trả ngay")}</Btn><Btn variant="secondary" onClick={() => setQuoteOn(true)}>{t("Xem báo giá tất toán sớm")}</Btn></> : undefined}>
      <div className="flex flex-col gap-3 p-4" data-testid="loans">
        {isError && <ErrorBox onRetry={() => refetch()}>{t("Chưa thể kết nối lúc này. Dữ liệu của bạn vẫn an toàn.")}</ErrorBox>}
        {isLoading && <><Skel className="h-24" /><Skel className="h-16" /></>}
        {!isLoading && !isError && !loan && (<Card className="space-y-3 text-center"><p className="text-sm">{t("Bạn chưa có khoản trả góp nào.")}</p><Btn onClick={() => router.push(`${B}/limit?from=hub`)}>{t("Xem hạn mức")}</Btn></Card>)}
        {loan && (
          <>
            <Card tone="brand" className="space-y-1" data-testid="next-due">
              <div className="text-xs">{due ? t("Kỳ tới {0}", `${due.dueDate.slice(8)}/${due.dueDate.slice(5, 7)}`) : t("Đã tất toán")}</div>
              <div className="text-[26px] font-bold">{due ? vnd(due.amount.amount) : "0 ₫"}</div>
              <div className="text-xs">{t("Còn {0} · Tổng còn phải trả {1}", vnd(loan.principalRemaining.amount), vnd(loan.totalRemaining.amount))}</div>
            </Card>
            {late && <ErrorBox>{t("Khoản trả đã quá hạn 1 ngày. Trả ngay để tránh bị tính phí.")}</ErrorBox>}
            <Card className="space-y-2"><KV k={t("Khoản vay")} v={`${loan.orderRef ? t("Đơn {0}", loan.orderRef) : t("Trả góp")} · ${vnd(loan.schedule.reduce((a, s) => a + s.amount.amount, 0))}`} /><KV k={t("Kỳ hạn")} v={t("{0} tháng (đã trả {1}/{2})", loan.schedule.length, paidCount(loan), loan.schedule.length)} /><KV k="EIR" v={loan.eir === 0 ? t("0% (người bán chịu)") : eirText(loan.eir)} />{loan.status === "PAUSED" && <KV k={t("Tạm hoãn đến")} v={loan.pauseUntil ?? ""} />}</Card>
            <Card tone="outline" className="text-xs">{t("Nhắc: nhắc kỳ trả 3 ngày trước hạn. Trả đúng hạn để tăng hạn mức.")}</Card>
            {quoteOn && (quote.data ? <Card tone="soft" className="space-y-1" data-testid="settle-quote"><KV k={t("Số tiền tất toán")} v={vnd(quote.data.payoff.amount)} bold /><KV k={t("Lãi tiết kiệm")} v={vnd(quote.data.interestSaved?.amount ?? 0)} /><p className="text-xs text-muted">{t("Tất toán sớm: không phí ẩn.")}</p></Card> : <Skel className="h-16" />)}
          </>
        )}
      </div>
    </WalletFrame>
  );
}
