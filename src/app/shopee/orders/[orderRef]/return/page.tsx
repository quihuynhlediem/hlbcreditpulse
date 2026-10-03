"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useRefundEvent } from "@/api/hooks";
import { track } from "@/api/track";
import { BottomBar, Header, PhoneShell } from "@/components/kit/PhoneShell";
import { Btn, Card, ErrorBox } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useProductLoan } from "@/lib/useLoan";
import { useFlow } from "@/store/flow";

export default function ReturnRequest() {
  const { orderRef } = useParams<{ orderRef: string }>();
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const { loan, isLoading } = useProductLoan(persona, "PAYMENT_INSTALLMENT");
  const refund = useRefundEvent();
  const [amount, setAmount] = useState(3_000_000);
  return (
    <PhoneShell skin="shopee" scr="SCR-13" flow="A" footer={
      <BottomBar>
        {refund.isError && <ErrorBox>Chưa gửi được yêu cầu. Thử lại.</ErrorBox>}
        <Btn disabled={!loan || refund.isPending} onClick={async () => {
          if (!loan) return;
          try {
            await refund.mutateAsync({ loanId: loan.loanId, orderRef, refundAmount: { amount, currency: "VND" }, reason: "RETURN" });
            track("refund_requested", { amount });
            router.push(`/viettel-money/loans/${loan.loanId}/refund?amt=${amount}`);
          } catch { /* shown above */ }
        }}>{refund.isPending ? "Đang gửi…" : "Gửi yêu cầu trả hàng"}</Btn>
        <Btn variant="secondary" data-testid="seller-rejects" disabled={!loan || refund.isPending} onClick={async () => {
          if (!loan) return;
          try {
            await refund.mutateAsync({ loanId: loan.loanId, orderRef, refundAmount: { amount, currency: "VND" }, reason: "RETURN_REJECTED" });
            router.push(`/viettel-money/loans/${loan.loanId}/refund?rejected=1`);
          } catch { /* shown above */ }
        }}>Người bán từ chối trả hàng (demo)</Btn>
      </BottomBar>
    }>
      <Header title="Yêu cầu trả hàng" onBack={() => router.back()} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">Yêu cầu trả hàng</h2>
          <label className="block text-[13px] text-muted" htmlFor="amt">Số tiền hoàn</label>
          <select id="amt" className="w-full rounded-lg border border-line bg-card px-3 py-3" value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
            {[1_000_000, 3_000_000, 6_000_000].map((v) => <option key={v} value={v}>{vnd(v)}</option>)}
          </select>
          <p className="text-xs text-muted">Khoản trả góp sẽ được điều chỉnh tự động.</p>
        </Card>
        {!isLoading && !loan && <ErrorBox>Đơn hàng này chưa có khoản trả góp. Chọn nhân vật “Mai (đang trả góp)” hoặc hoàn tất một đơn trước.</ErrorBox>}
      </div>
    </PhoneShell>
  );
}
