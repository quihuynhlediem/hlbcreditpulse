"use client";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { LoanTile } from "@/components/grab/Tile";
import { Card } from "@/components/ui";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";

/** SCR-40 Grab driver home. The tile is the only HLB touchpoint; the rest is the partner's own app. */
export default function GrabHome() {
  const { persona } = useFlow();
  const name = (CUSTOMER_BY_REF[persona]?.name ?? "Hùng").replace(/ \(.*\)/, "");
  return (
    <GrabFrame scr="SCR-40" nav="Trang chủ">
      <div className="bg-primary px-4 pb-5 pt-3 text-primary-foreground">
        <div className="text-xs">Xin chào, {name}</div>
        <div className="mt-1 flex items-end justify-between">
          <div><div className="text-[11px]">Thu nhập hôm nay</div><div className="text-[28px] font-bold leading-tight">486.000 ₫</div></div>
          <div className="text-right text-xs"><div>9 chuyến</div><div>6 giờ online</div></div>
        </div>
      </div>
      <div className="-mt-3 flex flex-col gap-3 px-4 pb-4">
        <Card className="grid grid-cols-3 gap-2 text-center text-xs">
          {[["Đơn hôm nay", "9"], ["Tỷ lệ nhận", "94%"], ["Đánh giá", "4,9 ★"]].map(([k, v]) => <div key={k}><div className="text-base font-bold">{v}</div><div className="text-muted">{k}</div></div>)}
        </Card>
        <LoanTile
          base="/grab" activePath="/grab/loan/schedule" product="DRIVER_INSTANT_LOAN" partnerId="grab" label="Vay nhanh cho tài xế"
          eligibleText={(m) => `Vay nhanh cho tài xế · tới ${m}`} activeLabel="Khoản vay đang trả"
          lockedFallback="Cần hoạt động ít nhất 3 tháng trên Grab để mở khóa"
        />
        <Card className="space-y-1.5">
          <div className="text-[13px] font-semibold">Dịch vụ cho đối tác</div>
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            {["Bảo hiểm", "Đồng phục", "Xăng dầu", "Hỗ trợ"].map((s) => <div key={s} className="rounded-xl bg-page p-2"><div className="mx-auto mb-1 h-6 w-6 rounded-full bg-primary-soft" />{s}</div>)}
          </div>
        </Card>
      </div>
    </GrabFrame>
  );
}
