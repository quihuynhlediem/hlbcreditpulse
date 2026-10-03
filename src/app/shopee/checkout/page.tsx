"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCreatePrescreen } from "@/api/hooks";
import { track } from "@/api/track";
import { BottomBar, Header, PhoneShell } from "@/components/kit/PhoneShell";
import { Lockup } from "@/components/ui";
import { cn } from "@/lib/cn";
import { vndCompact } from "@/lib/format";
import { useFlow, DEFAULT_ORDER } from "@/store/flow";

const MIN = 1_600_000, MAX = 90_100_000;

function Checkout() {
  const router = useRouter();
  const q = useSearchParams();
  const { persona, orderAmount, set } = useFlow();
  const [method, setMethod] = useState<"cod" | "spay" | "vm">("cod");
  const pre = useCreatePrescreen();
  const tiktok = q.get("skin") === "tiktok";
  const amountParam = q.get("amount");

  useEffect(() => { if (amountParam) set({ orderAmount: Number(amountParam) }); }, [amountParam, set]);
  useEffect(() => { pre.mutate({ partnerId: "viettel-money", hashedCustomerId: `h_${persona}` }); }, [persona]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = amountParam ? Number(amountParam) : orderAmount;
  const ship = 32_000;
  const eligible = amount >= MIN && amount <= MAX;
  const teaser = pre.data?.eligible && pre.data.bandMax ? `Có thể được duyệt tới ${vndCompact(pre.data.bandMax.amount)}` : null;

  return (
    <PhoneShell skin="shopee" scr="SCR-10" flow="A" footer={
      <BottomBar>
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-[11px] text-muted">Tổng thanh toán</div><div className="text-base font-bold text-primary" data-testid="grand-total">{vndCompact(amount + ship)}</div></div>
          <button
            data-testid="place-order"
            className="rounded-lg bg-primary px-9 py-3.5 text-base font-semibold text-primary-foreground"
            onClick={() => {
              if (method === "vm") { track("checkout_method_selected", { method: "viettel-money-hlb" }); router.push("/shopee/redirect"); }
              else router.push(`/shopee/orders/${DEFAULT_ORDER.orderRef}?result=cod`);
            }}
          >Đặt hàng</button>
        </div>
      </BottomBar>
    }>
      <Header title={tiktok ? "Thanh toán · TikTok Shop" : "Thanh toán"} onBack={() => router.push("/")} />
      <div className="flex flex-1 flex-col gap-2 pb-2">
        <section className="space-y-1 bg-card px-4 py-3.5" aria-label="Địa chỉ nhận hàng">
          <div className="text-[13px] font-semibold text-primary">Địa chỉ nhận hàng</div>
          <div className="text-sm font-medium">Nguyễn Thị Mai &nbsp;|&nbsp; (+84) 90 123 4567</div>
          <div className="text-[13px] text-muted">12 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
        </section>
        <section className="space-y-2.5 bg-card px-4 py-3.5" aria-label="Sản phẩm">
          <div className="text-sm font-semibold">{DEFAULT_ORDER.shop}</div>
          <div className="flex gap-3">
            <div className="h-[72px] w-[72px] shrink-0 rounded-md bg-line" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-sm">{DEFAULT_ORDER.title}</div>
              <div className="text-xs text-muted">Phân loại: Bạc</div>
              <div className="flex justify-between text-sm"><span className="font-semibold text-primary">{vndCompact(amount)}</span><span className="text-muted">x1</span></div>
            </div>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-[13px]"><span>Giao hàng nhanh</span><span className="font-medium">{vndCompact(ship)}</span></div>
        </section>
        <section className="flex justify-between bg-card px-4 py-3.5 text-sm"><span>Voucher của Shop</span><span className="text-[13px] text-muted">Chọn voucher ›</span></section>
        <section className="space-y-3 bg-card px-4 py-3.5" aria-label="Phương thức thanh toán">
          <h2 className="text-sm font-semibold">Phương thức thanh toán</h2>
          {([["cod", "Thanh toán khi nhận hàng"], ["spay", "ShopeePay"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 py-1 text-sm"><input type="radio" name="pm" checked={method === k} onChange={() => setMethod(k)} className="accent-[var(--brand)]" />{label}</label>
          ))}
          <label className={cn("flex items-start gap-3 rounded-lg p-2.5 text-sm", method === "vm" ? "border border-primary bg-primary-soft" : "border border-transparent", !eligible && "opacity-50")} data-testid="method-vm">
            <input type="radio" name="pm" disabled={!eligible} checked={method === "vm"} onChange={() => setMethod("vm")} className="mt-1 accent-[var(--brand)]" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Viettel Money · Trả góp qua HLB</span>
              {eligible ? (teaser && <span className="block text-xs text-muted" data-testid="prescreen-teaser">{teaser}</span>) : <span className="block text-xs text-muted">Trả góp qua HLB không áp dụng cho đơn này</span>}
              {eligible && <Lockup />}
            </span>
          </label>
        </section>
        <section className="space-y-1.5 bg-card px-4 py-3.5">
          <div className="flex justify-between text-[13px]"><span className="text-muted">Tổng tiền hàng</span><span>{vndCompact(amount)}</span></div>
          <div className="flex justify-between text-sm font-semibold"><span>Tổng thanh toán</span><span className="text-base font-bold text-primary">{vndCompact(amount + ship)}</span></div>
        </section>
        {tiktok && <p className="px-4 text-[11px] text-muted">Giao diện TikTok Shop / Lazada: [v1], dùng cùng phương thức ví.</p>}
      </div>
    </PhoneShell>
  );
}
export default function Page() { return <Suspense><Checkout /></Suspense>; }
