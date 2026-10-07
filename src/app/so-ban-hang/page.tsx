"use client";
import { HlbWalletCards } from "@/components/kit/HlbWalletCards";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { Card } from "@/components/ui";
import { vndCompact } from "@/lib/format";
import { useT, tKey } from "@/i18n";

const ACTIONS = [[tKey("Tạo mới đơn hàng"), "+", "bg-primary"], [tKey("Quản lý khách hàng"), "☺", "bg-blue-500"], [tKey("Quản lý sản phẩm"), "▣", "bg-amber-500"], [tKey("Quản lý khuyến mãi"), "%", "bg-orange-500"]] as const;

/** SCR-50 Sổ Bán Hàng store management: today's sales, quick actions, orders and the "Vốn kinh doanh" card. */
export default function SbhHome() {
  const t = useT();
  return (
    <SbhFrame scr="SCR-50" nav={tKey("Cửa hàng")}>
      <div className="bg-primary px-4 pb-6 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-3 text-center"><div className="text-[11px] text-muted">{t("Doanh thu hôm nay")}</div><div className="text-base font-bold text-ink" data-testid="today-sales">{vndCompact(3_285_000)}</div></div>
          <div className="rounded-xl bg-card p-3 text-center"><div className="text-[11px] text-muted">{t("Tổng đơn đã giao")}</div><div className="text-base font-bold text-ink">138</div></div>
        </div>
      </div>
      <div className="-mt-3 flex flex-col gap-3 px-4 pb-4">
        <Card className="space-y-1 text-[13px]"><div><span className="font-semibold">{t("Mẹo:")}</span> {t("Càng chia sẻ, càng về nhiều đơn.")}</div><div className="text-xs text-muted">{t("Khách có thể đặt hàng tại địa chỉ số hóa của cửa hàng.")}</div></Card>
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          {ACTIONS.map(([l, g, c]) => <div key={l} className="rounded-xl bg-card p-2"><div className={`mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white ${c}`} aria-hidden>{g}</div>{t(l)}</div>)}
        </div>
        <HlbWalletCards />
        <Card className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{t("Đơn hàng")}</span><span className="text-xs text-primary">{t("Tất cả ›")}</span></div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs"><div className="rounded-xl bg-page p-3"><div className="text-lg font-bold">3</div>{t("Chờ xác nhận")}</div><div className="rounded-xl bg-page p-3"><div className="text-lg font-bold">3</div>{t("Đang giao")}</div></div>
        </Card>
      </div>
    </SbhFrame>
  );
}
