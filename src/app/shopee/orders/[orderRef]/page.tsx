"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { track } from "@/api/track";
import { BottomBar, Header, PhoneShell } from "@/components/kit/PhoneShell";
import { Btn, Card, KV } from "@/components/ui";
import { vnd, vndCompact } from "@/lib/format";
import { useProductLoan } from "@/lib/useLoan";
import { useOrder, useShopperWallet } from "@/lib/wallet";
import { useFlow } from "@/store/flow";
import { useT, tKey } from "@/i18n";

function Order() {
  const t = useT();
  const { orderRef } = useParams<{ orderRef: string }>();
  const result = useSearchParams().get("result");
  const router = useRouter();
  const persona = useFlow((s) => s.persona);
  const orderAmount = useFlow((s) => s.orderAmount);
  const wallet = useShopperWallet();
  const order = useOrder();
  const { loan } = useProductLoan(persona, "PAYMENT_INSTALLMENT");
  useEffect(() => { if (result) track("order_returned", { status: result }); }, [result]);

  if (result === "paid" || result === "cancelled" || result === "failed" || result === "cod") {
    const title = t(result === "paid" || result === "cod" ? tKey("Đặt hàng thành công") : result === "cancelled" ? tKey("Bạn đã hủy thanh toán trả góp") : tKey("Thanh toán chưa hoàn tất. Đơn hàng chưa bị trừ tiền."));
    const good = result === "paid" || result === "cod";
    const monthly = loan?.schedule[0]?.amount.amount;
    return (
      <PhoneShell skin="shopee" scr="SCR-12" flow="A" footer={<BottomBar><Btn onClick={() => router.push(`/shopee/orders/${orderRef}`)}>{t("Xem đơn hàng")}</Btn><Btn variant="secondary" onClick={() => router.push(result === "failed" || result === "cancelled" ? "/shopee/checkout" : "/")}>{good ? t("Tiếp tục mua sắm") : t("Chọn cách thanh toán khác")}</Btn></BottomBar>}>
        <Header title={good ? t("Đặt hàng thành công") : t("Thanh toán")} />
        <div className="flex flex-1 flex-col items-center gap-3.5 p-6" data-testid="order-result" data-result={result}>
          <div className={`grid h-16 w-16 place-items-center rounded-full text-3xl font-bold text-primary-foreground ${good ? "bg-success" : "bg-warning"}`}>{good ? "✓" : "!"}</div>
          <h2 className="text-center text-xl font-bold" role="status">{title}</h2>
          {result === "paid" && (
            <Card className="w-full space-y-2">
              <KV k={t("Mã đơn hàng")} v={orderRef} />
              <KV k={t("Thanh toán qua")} v={wallet.name} />
              <KV k={t("Trả góp")} v={t("{0} tháng × {1}", loan ? loan.schedule.length : 6, vnd(loan ? monthly ?? 0 : 2_000_000))} />
              <KV k={t("Tổng số tiền phải trả")} v={vnd(loan ? loan.schedule.reduce((a, s) => a + s.amount.amount, 0) : 12_000_000)} />
            </Card>
          )}
        </div>
      </PhoneShell>
    );
  }
  return (
    <PhoneShell skin="shopee" scr="SCR-13" flow="A" footer={<BottomBar><Btn onClick={() => router.push(`/shopee/orders/${orderRef}/return`)}>{t("Yêu cầu trả hàng")}</Btn></BottomBar>}>
      <Header title={t("Chi tiết đơn hàng")} onBack={() => router.push("/")} />
      <div className="flex flex-1 flex-col gap-2">
        <section className="space-y-1 bg-card px-4 py-3.5"><div className="text-sm font-semibold text-primary">{t("Đã giao hàng")}</div><div className="text-xs text-muted">{t("Mã đơn {0} · {1} · Trả góp {2} tháng", orderRef, wallet.name, loan?.schedule.length ?? 6)}</div></section>
        <section className="flex gap-3 bg-card px-4 py-3.5"><div className="h-16 w-16 shrink-0 rounded-md bg-line" /><div className="space-y-1"><div className="text-[13px]">{order.title}</div><div className="text-[13px] font-semibold text-primary">{vndCompact(orderAmount)}</div></div></section>
        {loan && <section className="bg-card px-4 py-3.5 text-[13px]">{t("Khoản trả góp liên kết:")} <Link className="font-semibold text-primary" href={`${wallet.base}/loans`}>{t("Xem khoản vay")}</Link></section>}
      </div>
    </PhoneShell>
  );
}
export default function Page() { return <Suspense><Order /></Suspense>; }
