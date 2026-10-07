"use client";
import { useRouter } from "next/navigation";
import { GrabFrame } from "@/components/grab/GrabFrame";
import { Card } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useT, tKey } from "@/i18n";

const WEEKS = [[tKey("T-3"), 3_100_000], [tKey("T-2"), 3_450_000], [tKey("T-1"), 3_300_000], [tKey("Tuần này"), 3_700_000]] as const;

/** SCR-41 driver earnings: weekly payouts, trend and the eligibility banner. */
export default function Earnings() {
  const t = useT();
  const router = useRouter();
  const max = Math.max(...WEEKS.map((w) => w[1]));
  return (
    <GrabFrame scr="SCR-41" title={tKey("Thu nhập")} back={() => router.push("/grab")} nav={tKey("Thu nhập")}>
      <div className="flex flex-col gap-3 p-4">
        <Card className="space-y-3">
          <div className="text-xs text-muted">{t("Thu nhập 4 tuần gần nhất")}</div>
          <div className="text-xl font-bold">{vnd(WEEKS.reduce((a, w) => a + w[1], 0))}</div>
          <div className="flex h-24 items-end gap-3" role="img" aria-label={t("Biểu đồ thu nhập theo tuần")}>
            {WEEKS.map(([l, v]) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary" style={{ height: `${Math.round((v / max) * 88)}px` }} />
                <span className="text-[10px] text-muted">{t(l)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-2">
          <div className="text-[13px] font-semibold">{t("Lần nhận tiền gần đây")}</div>
          {([[tKey("Thứ Hai"), 1_020_000], [tKey("Thứ Hai tuần trước"), 880_000], [tKey("Thứ Hai 2 tuần trước"), 1_150_000]] as const).map(([d, v]) => <div key={d} className="flex justify-between text-[13px]"><span className="text-muted">{t(d)}</span><span className="font-semibold">{vnd(v)}</span></div>)}
        </Card>
      </div>
    </GrabFrame>
  );
}
