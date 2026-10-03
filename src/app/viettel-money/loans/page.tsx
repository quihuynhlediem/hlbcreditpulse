"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreatePayment, useSettlementQuote } from "@/api/hooks";
import { track } from "@/api/track";
import { VmFrame } from "@/components/vm/VmFrame";
import { Btn, Card, ErrorBox, KV, Lockup, Skel } from "@/components/ui";
import { eirText, vnd } from "@/lib/format";
import { nextDue, paidCount, useProductLoan } from "@/lib/useLoan";
import { useFlow } from "@/store/flow";

/** SCR-29 my installment loans: schedule, repay, early-settlement quote, late notice. */
export default function Loans() {
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const { loan, isLoading, isError, refetch } = useProductLoan(persona, "PAYMENT_INSTALLMENT");
  const pay = useCreatePayment();
  const [quoteOn, setQuoteOn] = useState(false);
  const quote = useSettlementQuote(loan?.loanId, quoteOn);
  const due = nextDue(loan);
  const late = due && new Date(due.dueDate) < new Date(new Date().toDateString());
  return (
    <VmFrame scr="SCR-29" title="Khoản trả góp" back="/viettel-money" footer={loan && due ? <><Lockup /><Btn disabled={pay.isPending} onClick={async () => { await pay.mutateAsync({ loanId: loan.loanId, amount: due.amount }); track("repayment_recorded", { loanId: loan.loanId }); }}>{pay.isPending ? "Đang thanh toán…" : "Trả ngay"}</Btn><Btn variant="secondary" onClick={() => setQuoteOn(true)}>Xem báo giá tất toán sớm</Btn></> : undefined}>
      <div className="flex flex-col gap-3 p-4" data-testid="loans">
        {isError && <ErrorBox onRetry={() => refetch()}>Chưa thể kết nối lúc này. Dữ liệu của bạn vẫn an toàn.</ErrorBox>}
        {isLoading && <><Skel className="h-24" /><Skel className="h-16" /></>}
        {!isLoading && !isError && !loan && (<Card className="space-y-3 text-center"><p className="text-sm">Bạn chưa có khoản trả góp nào.</p><Btn onClick={() => router.push("/viettel-money/limit?from=hub")}>Xem hạn mức</Btn></Card>)}
        {loan && (
          <>
            <Card tone="brand" className="space-y-1" data-testid="next-due">
              <div className="text-xs">{due ? `Kỳ tới ${due.dueDate.slice(8)}/${due.dueDate.slice(5, 7)}` : "Đã tất toán"}</div>
              <div className="text-[26px] font-bold">{due ? vnd(due.amount.amount) : "0 ₫"}</div>
              <div className="text-xs">Còn {vnd(loan.principalRemaining.amount)} · Tổng còn phải trả {vnd(loan.totalRemaining.amount)}</div>
            </Card>
            {late && <ErrorBox>Khoản trả đã quá hạn 1 ngày. Trả ngay để tránh bị tính phí.</ErrorBox>}
            <Card className="space-y-2"><KV k="Khoản vay" v={`${loan.orderRef ? "Đơn " + loan.orderRef : "Trả góp"} · ${vnd(loan.schedule.reduce((a, s) => a + s.amount.amount, 0))}`} /><KV k="Kỳ hạn" v={`${loan.schedule.length} tháng (đã trả ${paidCount(loan)}/${loan.schedule.length})`} /><KV k="EIR" v={loan.eir === 0 ? "0% (người bán chịu)" : eirText(loan.eir)} />{loan.status === "PAUSED" && <KV k="Tạm hoãn đến" v={loan.pauseUntil ?? ""} />}</Card>
            <Card tone="outline" className="text-xs">Nhắc: nhắc kỳ trả 3 ngày trước hạn. Trả đúng hạn để tăng hạn mức.</Card>
            {quoteOn && (quote.data ? <Card tone="soft" className="space-y-1" data-testid="settle-quote"><KV k="Số tiền tất toán" v={vnd(quote.data.payoff.amount)} bold /><KV k="Lãi tiết kiệm" v={vnd(quote.data.interestSaved?.amount ?? 0)} /><p className="text-xs text-muted">Tất toán sớm: không phí ẩn.</p></Card> : <Skel className="h-16" />)}
          </>
        )}
      </div>
    </VmFrame>
  );
}
