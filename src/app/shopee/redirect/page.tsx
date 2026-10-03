"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { PhoneShell } from "@/components/kit/PhoneShell";
import { Btn, ErrorBox } from "@/components/ui";
import { DEFAULT_ORDER } from "@/store/flow";

function Redirecting() {
  const router = useRouter();
  const fail = useSearchParams().get("fail") === "1";
  useEffect(() => {
    if (fail) return;
    const t = setTimeout(() => router.replace("/viettel-money/pay/new"), 1100);
    return () => clearTimeout(t);
  }, [fail, router]);
  return (
    <PhoneShell skin="shopee" scr="SCR-11" flow="A">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        {fail ? (
          <>
            <ErrorBox>Không mở được Viettel Money. Chọn cách thanh toán khác.</ErrorBox>
            <Btn onClick={() => router.replace("/shopee/redirect")}>Thử lại</Btn>
            <Btn variant="secondary" onClick={() => router.push("/shopee/checkout")}>Chọn cách thanh toán khác</Btn>
          </>
        ) : (
          <>
            <div className="skeleton h-14 w-14 rounded-full" aria-hidden />
            <h1 className="text-lg font-bold" role="status">Đang chuyển sang Viettel Money…</h1>
            <p className="text-[13px] text-muted">Đơn hàng {DEFAULT_ORDER.orderRef} được giữ cho bạn. Bạn sẽ quay lại Shopee sau khi hoàn tất.</p>
            <button className="rounded-lg border border-line px-5 py-2.5 text-[13px] font-medium text-muted" onClick={() => router.push("/shopee/checkout")}>Hủy</button>
          </>
        )}
      </div>
    </PhoneShell>
  );
}
export default function Page() { return <Suspense><Redirecting /></Suspense>; }
