"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { PhoneShell } from "@/components/kit/PhoneShell";
import { Btn, ErrorBox } from "@/components/ui";
import { useOrder, useShopperWallet } from "@/lib/wallet";
import { useT } from "@/i18n";

function Redirecting() {
  const t = useT();
  const wallet = useShopperWallet();
  const order = useOrder();
  const router = useRouter();
  const fail = useSearchParams().get("fail") === "1";
  useEffect(() => {
    if (fail) return;
    const t = setTimeout(() => router.replace(`${wallet.base}/pay/new`), 1100);
    return () => clearTimeout(t);
  }, [fail, router, wallet.base]);
  return (
    <PhoneShell skin="shopee" scr="SCR-11" flow="A">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        {fail ? (
          <>
            <ErrorBox>{t("Không mở được {0}. Chọn cách thanh toán khác.", wallet.name)}</ErrorBox>
            <Btn onClick={() => router.replace("/shopee/redirect")}>{t("Thử lại")}</Btn>
            <Btn variant="secondary" onClick={() => router.push("/shopee/checkout")}>{t("Chọn cách thanh toán khác")}</Btn>
          </>
        ) : (
          <>
            <div className="skeleton h-14 w-14 rounded-full" aria-hidden />
            <h1 className="text-lg font-bold" role="status">{t("Đang chuyển sang {0}…", wallet.name)}</h1>
            <p className="text-[13px] text-muted">{t("Đơn hàng {0} được giữ cho bạn. Bạn sẽ quay lại Shopee sau khi hoàn tất.", order.orderRef)}</p>
            <button className="rounded-lg border border-line px-5 py-2.5 text-[13px] font-medium text-muted" onClick={() => router.push("/shopee/checkout")}>{t("Hủy")}</button>
          </>
        )}
      </div>
    </PhoneShell>
  );
}
export default function Page() { return <Suspense><Redirecting /></Suspense>; }
