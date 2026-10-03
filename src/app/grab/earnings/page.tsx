"use client";
import { useRouter } from "next/navigation";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { LoanTile } from "@/components/grab/Tile";
import { Card } from "@/components/ui";
import { vnd } from "@/lib/format";

const WEEKS = [["T-3", 3_100_000], ["T-2", 3_450_000], ["T-1", 3_300_000], ["Tuần này", 3_700_000]] as const;

/** SCR-41 driver earnings: weekly payouts, trend and the eligibility banner. */
export default function Earnings() {
  const router = useRouter();
  const max = Math.max(...WEEKS.map((w) => w[1]));
  return (
    <GrabFrame scr="SCR-41" title="Thu nhập" back={() => router.push("/grab")} nav="Thu nhập">
      <div className="flex flex-col gap-3 p-4">
        <Card className="space-y-3">
          <div className="text-xs text-muted">Thu nhập 4 tuần gần nhất</div>
          <div className="text-xl font-bold">{vnd(WEEKS.reduce((a, w) => a + w[1], 0))}</div>
          <div className="flex h-24 items-end gap-3" role="img" aria-label="Biểu đồ thu nhập theo tuần">
            {WEEKS.map(([l, v]) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary" style={{ height: `${Math.round((v / max) * 88)}px` }} />
                <span className="text-[10px] text-muted">{l}</span>
              </div>
            ))}
          </div>
        </Card>
        <LoanTile
          variant="banner" base="/grab" activePath="/grab/loan/schedule" product="DRIVER_INSTANT_LOAN" partnerId="grab" label="Vay nhanh cho tài xế"
          eligibleText={(m) => `Thu nhập 3 tháng ổn định — bạn đủ điều kiện vay tới ${m}`} activeLabel="Khoản vay đang trả"
          lockedFallback="Chưa có thu nhập trong 4 tuần gần nhất."
        />
        <Card className="space-y-2">
          <div className="text-[13px] font-semibold">Lần nhận tiền gần đây</div>
          {[["Thứ Hai", "1.020.000 ₫"], ["Thứ Hai tuần trước", "880.000 ₫"], ["Thứ Hai 2 tuần trước", "1.150.000 ₫"]].map(([d, v]) => <div key={d} className="flex justify-between text-[13px]"><span className="text-muted">{d}</span><span className="font-semibold">{v}</span></div>)}
        </Card>
      </div>
    </GrabFrame>
  );
}
