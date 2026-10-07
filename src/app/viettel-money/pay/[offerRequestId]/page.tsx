"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCreateOffer } from "@/api/hooks";
import { track } from "@/api/track";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useWallet, useOrder } from "@/lib/wallet";
import { Btn, Card, ErrorBox, Skel } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";
import { useT, tKey } from "@/i18n";

/** SCR-21 wallet payment landing: creates the offer set (D-34: still-checking after 3 s, retry after 8 s). */
export default function PayLanding() {
  const w = useWallet();
  const B = w.base;
  const order = useOrder();
  const t = useT();
  const router = useRouter();
  const { persona, orderAmount, set } = useFlow();
  const create = useCreateOffer();
  const started = useRef(false);
  const [secs, setSecs] = useState(0);
  const run = () => {
    setSecs(0);
    create.mutate(
      { partnerId: w.partnerId, productType: "PAYMENT_INSTALLMENT", customerRef: persona, orderRef: order.orderRef, amount: { amount: orderAmount, currency: "VND" }, consentReceiptIds: [] },
      { onSuccess: (o) => { set({ offerRequestId: o.offerRequestId }); track("offers_returned", { offerRequestId: o.offerRequestId, rung: o.rung, latencyMs: secs * 1000 }); router.replace(`${B}/offers/${o.offerRequestId}`); } },
    );
  };
  useEffect(() => { if (started.current) return; started.current = true; run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!create.isPending) return; const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t); }, [create.isPending]);
  const slow = secs >= 3, veryslow = secs >= 8;
  return (
    <WalletFrame scr="SCR-21" title={tKey("Thanh toán trả góp")} back={() => router.push("/shopee/checkout")} footer={(create.isError || veryslow) ? <><Btn variant="secondary" onClick={() => { started.current = true; run(); }}>{t("Thử lại")}</Btn><Btn variant="secondary" onClick={() => router.push("/shopee/checkout")}>{t("Chọn cách thanh toán khác")}</Btn></> : undefined}>
      <div className="flex flex-col gap-3 p-4">
        <Card className="space-y-1">
          <div className="text-xs text-muted">{t("Đơn hàng Shopee")} · {order.shop}</div>
          <div className="flex justify-between text-sm"><span className="font-medium">{order.short}</span><span className="font-bold">{vnd(orderAmount)}</span></div>
        </Card>
        {create.isError ? (
          <ErrorBox>{(create.error as { type?: string } | null)?.type?.endsWith("order-out-of-range") ? t("Giá trị đơn hàng ngoài phạm vi trả góp") : t("Chưa thể tải gói trả góp lúc này. Đơn hàng của bạn vẫn được giữ.")}</ErrorBox>
        ) : (
          <Card tone="soft" className="space-y-1.5" role="status">
            <div className="text-sm font-semibold">{slow ? t("Đang kiểm tra, vui lòng chờ thêm vài giây…") : t("Đang tìm gói trả góp phù hợp…")}</div>
            <div className="text-xs text-muted">{slow ? t("Đơn hàng của bạn vẫn được giữ.") : t("Chỉ mất vài giây.")}</div>
          </Card>
        )}
        {[0, 1, 2].map((i) => <Card key={i} className="space-y-2.5"><Skel className="h-[18px] w-28" /><Skel className="h-3" /><Skel className="h-3" /></Card>)}
      </div>
    </WalletFrame>
  );
}
