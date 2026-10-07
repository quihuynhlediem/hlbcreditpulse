"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCreatePrescreen } from "@/api/hooks";
import { track } from "@/api/track";
import { BottomBar, Header, PhoneShell } from "@/components/kit/PhoneShell";
import { Lockup } from "@/components/ui";
import { cn } from "@/lib/cn";
import { vndCompact } from "@/lib/format";
import { useShopperWallet, useOrder } from "@/lib/wallet";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";
import { useT, tKey } from "@/i18n";

const MIN = 1_600_000, MAX = 90_100_000;

function Checkout() {
  const t = useT();
  const router = useRouter();
  const q = useSearchParams();
  const { persona, orderAmount, set } = useFlow();
  const wallet = useShopperWallet();
  const order = useOrder();
  const [method, setMethod] = useState<"cod" | "spay" | "vm">("vm");
  const pre = useCreatePrescreen();
  const tiktok = q.get("skin") === "tiktok";
  const amountParam = q.get("amount");

  useEffect(() => { if (amountParam) set({ orderAmount: Number(amountParam) }); }, [amountParam, set]);
  useEffect(() => { pre.mutate({ partnerId: wallet.partnerId, hashedCustomerId: `h_${persona}` }); }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = amountParam ? Number(amountParam) : orderAmount;
  const ship = 32_000;
  const eligible = amount >= MIN && amount <= MAX;
  const chosen = eligible ? method : method === "vm" ? "cod" : method;
  const teaser = pre.data?.eligible && pre.data.bandMax ? t("Có thể được duyệt tới {0}", vndCompact(pre.data.bandMax.amount)) : null;

  return (
    <PhoneShell skin="shopee" scr="SCR-10" flow="A" footer={
      <BottomBar>
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-[11px] text-muted">{t("Tổng thanh toán")}</div><div className="text-base font-bold text-primary" data-testid="grand-total">{vndCompact(amount + ship)}</div></div>
          <button
            data-testid="place-order"
            className="rounded-lg bg-primary px-9 py-3.5 text-base font-semibold text-primary-foreground"
            onClick={() => {
              if (chosen === "vm") { track("checkout_method_selected", { method: `${wallet.partnerId}-hlb` }); router.push("/shopee/redirect"); }
              else router.push(`/shopee/orders/${order.orderRef}?result=cod`);
            }}
          >{t("Đặt hàng")}</button>
        </div>
      </BottomBar>
    }>
      <Header title={tiktok ? t("Thanh toán · TikTok Shop") : t("Thanh toán")} onBack={() => router.push("/")} />
      <div className="flex flex-1 flex-col gap-2 pb-2">
        <section className="space-y-1 bg-card px-4 py-3.5" aria-label={t("Địa chỉ nhận hàng")}>
          <div className="text-[13px] font-semibold text-primary">{t("Địa chỉ nhận hàng")}</div>
          <div className="text-sm font-medium">{CUSTOMER_BY_REF[persona]?.fullName ?? tKey("Nguyễn Thị Mai")} &nbsp;|&nbsp; (+84) 90 123 4567</div>
          <div className="text-[13px] text-muted">{t("12 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh")}</div>
        </section>
        <section className="space-y-2.5 bg-card px-4 py-3.5" aria-label={t("Sản phẩm")}>
          <div className="text-sm font-semibold">{order.shop}</div>
          <div className="flex gap-3">
            <div className="h-[72px] w-[72px] shrink-0 rounded-md bg-line" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-sm">{order.title}</div>
              <div className="text-xs text-muted">{t("Phân loại: Bạc")}</div>
              <div className="flex justify-between text-sm"><span className="font-semibold text-primary">{vndCompact(amount)}</span><span className="text-muted">x1</span></div>
            </div>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-[13px]"><span>{t("Giao hàng nhanh")}</span><span className="font-medium">{vndCompact(ship)}</span></div>
        </section>
        <section className="flex justify-between bg-card px-4 py-3.5 text-sm"><span>{t("Voucher của Shop")}</span><span className="text-[13px] text-muted">{t("Chọn voucher ›")}</span></section>
        <section className="space-y-3 bg-card px-4 py-3.5" aria-label={t("Phương thức thanh toán")}>
          <h2 className="text-sm font-semibold">{t("Phương thức thanh toán")}</h2>
          <label className={cn("flex items-start gap-3 rounded-lg p-2.5 text-sm", chosen === "vm" ? "border border-primary bg-primary-soft" : "border border-transparent", !eligible && "opacity-50")} data-testid="method-vm">
            <input type="radio" name="pm" disabled={!eligible} checked={chosen === "vm"} onChange={() => setMethod("vm")} className="mt-1 accent-[var(--brand)]" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("{0} · Trả góp qua HLB", wallet.name)}</span>
              {eligible ? (teaser && <span className="block text-xs text-muted" data-testid="prescreen-teaser">{teaser}</span>) : <span className="block text-xs text-muted">{t("Trả góp qua HLB không áp dụng cho đơn này")}</span>}
              {eligible && <Lockup />}
            </span>
          </label>
          {([["cod", tKey("Thanh toán khi nhận hàng")], ["spay", "ShopeePay"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 py-1 text-sm"><input type="radio" name="pm" checked={chosen === k} onChange={() => setMethod(k)} className="accent-[var(--brand)]" />{t(label)}</label>
          ))}
        </section>
        <section className="space-y-1.5 bg-card px-4 py-3.5">
          <div className="flex justify-between text-[13px]"><span className="text-muted">{t("Tổng tiền hàng")}</span><span>{vndCompact(amount)}</span></div>
          <div className="flex justify-between text-sm font-semibold"><span>{t("Tổng thanh toán")}</span><span className="text-base font-bold text-primary">{vndCompact(amount + ship)}</span></div>
        </section>
      </div>
    </PhoneShell>
  );
}
export default function Page() { return <Suspense><Checkout /></Suspense>; }
