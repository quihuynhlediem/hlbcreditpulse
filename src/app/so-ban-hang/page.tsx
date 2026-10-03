"use client";
import Link from "next/link";
import { LoanTile } from "@/components/grab/Tile";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { Card } from "@/components/ui";

const ACTIONS = [["Tạo mới đơn hàng", "+", "bg-primary"], ["Quản lý khách hàng", "☺", "bg-blue-500"], ["Quản lý sản phẩm", "▣", "bg-amber-500"], ["Quản lý khuyến mãi", "%", "bg-orange-500"]] as const;

/** SCR-50 Sổ Bán Hàng store management: today's sales, quick actions, orders and the "Vốn kinh doanh" card. */
export default function SbhHome() {
  return (
    <SbhFrame scr="SCR-50" nav="Cửa hàng">
      <div className="bg-primary px-4 pb-6 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-3 text-center"><div className="text-[11px] text-muted">Doanh thu hôm nay</div><div className="text-base font-bold text-ink" data-testid="today-sales">3.285.000₫</div></div>
          <div className="rounded-xl bg-card p-3 text-center"><div className="text-[11px] text-muted">Tổng đơn đã giao</div><div className="text-base font-bold text-ink">138</div></div>
        </div>
      </div>
      <div className="-mt-3 flex flex-col gap-3 px-4 pb-4">
        <Card className="space-y-1 text-[13px]"><div><span className="font-semibold">Mẹo:</span> Càng chia sẻ, càng về nhiều đơn.</div><div className="text-xs text-muted">Khách có thể đặt hàng tại địa chỉ số hóa của cửa hàng.</div></Card>
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          {ACTIONS.map(([l, g, c]) => <div key={l} className="rounded-xl bg-card p-2"><div className={`mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white ${c}`} aria-hidden>{g}</div>{l}</div>)}
        </div>
        <LoanTile
          base="/so-ban-hang" activePath="/so-ban-hang/funding/tracker" product="SELLER_FUNDING" partnerId="so-ban-hang" label="Vốn kinh doanh"
          eligibleText={(m) => `Vốn kinh doanh · tới ${m}`} activeLabel="Khoản vốn đang trả"
          lockedFallback="Cần thêm 90 ngày dữ liệu bán hàng"
        />
        <Card className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">Đơn hàng</span><span className="text-xs text-primary">Tất cả ›</span></div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs"><div className="rounded-xl bg-page p-3"><div className="text-lg font-bold">3</div>Chờ xác nhận</div><div className="rounded-xl bg-page p-3"><div className="text-lg font-bold">3</div>Đang giao</div></div>
        </Card>
        <Link href="/so-ban-hang/restock/PO-0412" className="rounded-xl border border-line bg-card p-3 text-[13px]"><span className="font-semibold">Đơn nhập hàng PO-0412</span><span className="block text-xs text-muted">Nhà phân phối Hoàng Gia · chờ thanh toán</span></Link>
      </div>
    </SbhFrame>
  );
}
