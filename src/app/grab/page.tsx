"use client";
import { HlbWalletCards } from "@/components/kit/HlbWalletCards";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { Card } from "@/components/ui";
import { useT, tKey } from "@/i18n";
import { dec, vnd } from "@/lib/format";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";

/** SCR-40 Grab home: the partner's own app plus the HLB entry components (pre-approved banner, active loan). */
export default function GrabHome() {
  const t = useT();
  const { persona } = useFlow();
  const name = (CUSTOMER_BY_REF[persona]?.name ?? tKey("Hùng")).replace(/ \(.*\)/, "");
  return (
    <GrabFrame scr="SCR-40" nav={tKey("Trang chủ")}>
      <div className="bg-primary px-4 pb-5 pt-3 text-primary-foreground">
        <div className="text-xs">{t("Xin chào, {0}", t(name))}</div>
        <div className="mt-1 flex items-end justify-between">
          <div><div className="text-[11px]">{t("Thu nhập hôm nay")}</div><div className="text-[28px] font-bold leading-tight">{vnd(486_000)}</div></div>
          <div className="text-right text-xs"><div>{t("{0} chuyến", 9)}</div><div>{t("{0} giờ online", 6)}</div></div>
        </div>
      </div>
      <div className="-mt-3 flex flex-col gap-3 px-4 pb-4">
        <Card className="grid grid-cols-3 gap-2 text-center text-xs">
          {[[tKey("Đơn hôm nay"), "9"], [tKey("Tỷ lệ nhận"), "94%"], [tKey("Đánh giá"), `${dec(4.9, 1)} ★`]].map(([k, v]) => <div key={k}><div className="text-base font-bold">{v}</div><div className="text-muted">{t(k)}</div></div>)}
        </Card>
        <HlbWalletCards />
        <Card className="space-y-1.5">
          <div className="text-[13px] font-semibold">{t("Dịch vụ cho đối tác")}</div>
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            {[tKey("Bảo hiểm"), tKey("Đồng phục"), tKey("Xăng dầu"), tKey("Hỗ trợ")].map((s) => <div key={s} className="rounded-xl bg-page p-2"><div className="mx-auto mb-1 h-6 w-6 rounded-full bg-primary-soft" />{t(s)}</div>)}
          </div>
        </Card>
      </div>
    </GrabFrame>
  );
}
