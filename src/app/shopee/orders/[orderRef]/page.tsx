"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { track } from "@/api/track";
import { BottomBar, Header, PhoneShell } from "@/components/kit/PhoneShell";
import { Btn, Card, KV } from "@/components/ui";
import { vnd, vndCompact } from "@/lib/format";
import { useProductLoan } from "@/lib/useLoan";
import { DEFAULT_ORDER, useFlow } from "@/store/flow";

function Order() {
  const { orderRef } = useParams<{ orderRef: string }>();
  const result = useSearchParams().get("result");
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const { loan } = useProductLoan(persona, "PAYMENT_INSTALLMENT");
  useEffect(() => { if (result) track("order_returned", { status: result }); }, [result]);

  if (result === "paid" || result === "cancelled" || result === "failed" || result === "cod") {
    const title = result === "paid" || result === "cod" ? "Đặt hàng thành công" : result === "cancelled" ? "Bạn đã hủy thanh toán trả góp" : "Thanh toán chưa hoàn tất. Đơn hàng chưa bị trừ tiền.";
    const good = result === "paid" || result === "cod";
    const monthly = loan?.schedule[0]?.amount.amount;
    return (
      <PhoneShell skin="shopee" scr="SCR-12" flow="A" footer={<BottomBar><Btn onClick={() => router.push(`/shopee/orders/${orderRef}`)}>Xem đơn hàng</Btn><Btn variant="secondary" onClick={() => router.push(result === "failed" || result === "cancelled" ? "/shopee/checkout" : "/")}>{good ? "Tiếp tục mua sắm" : "Chọn cách thanh toán khác"}</Btn></BottomBar>}>
        <Header title={good ? "Đặt hàng thành công" : "Thanh toán"} />
        <div className="flex flex-1 flex-col items-center gap-3.5 p-6" data-testid="order-result" data-result={result}>
          <div className={`grid h-16 w-16 place-items-center rounded-full text-3xl font-bold text-primary-foreground ${good ? "bg-success" : "bg-warning"}`}>{good ? "✓" : "!"}</div>
          <h2 className="text-center text-xl font-bold" role="status">{title}</h2>
          {result === "paid" && (
            <Card className="w-full space-y-2">
              <KV k="Mã đơn hàng" v={orderRef} />
              <KV k="Thanh toán qua" v="Viettel Money" />
              <KV k="Trả góp" v={loan ? `${loan.schedule.length} tháng × ${vnd(monthly ?? 0)}` : "6 tháng × 2.000.000 ₫"} />
              <KV k="Tổng số tiền phải trả" v={loan ? vnd(loan.schedule.reduce((a, s) => a + s.amount.amount, 0)) : "12.000.000 ₫"} />
            </Card>
          )}
        </div>
      </PhoneShell>
    );
  }
  return (
    <PhoneShell skin="shopee" scr="SCR-13" flow="A" footer={<BottomBar><Btn onClick={() => router.push(`/shopee/orders/${orderRef}/return`)}>Yêu cầu trả hàng</Btn></BottomBar>}>
      <Header title="Chi tiết đơn hàng" onBack={() => router.push("/")} />
      <div className="flex flex-1 flex-col gap-2">
        <section className="space-y-1 bg-card px-4 py-3.5"><div className="text-sm font-semibold text-primary">Đã giao hàng</div><div className="text-xs text-muted">Mã đơn {orderRef} · Viettel Money · Trả góp {loan?.schedule.length ?? 6} tháng</div></section>
        <section className="flex gap-3 bg-card px-4 py-3.5"><div className="h-16 w-16 shrink-0 rounded-md bg-line" /><div className="space-y-1"><div className="text-[13px]">{DEFAULT_ORDER.title}</div><div className="text-[13px] font-semibold text-primary">{vndCompact(DEFAULT_ORDER.amount)}</div></div></section>
        {loan && <section className="bg-card px-4 py-3.5 text-[13px]">Khoản trả góp liên kết: <Link className="font-semibold text-primary" href="/viettel-money/loans">Xem khoản vay</Link></section>}
      </div>
    </PhoneShell>
  );
}
export default function Page() { return <Suspense><Order /></Suspense>; }
