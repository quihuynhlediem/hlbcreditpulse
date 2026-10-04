"use client";
import { useRouter } from "next/navigation";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { Card } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useT } from "@/i18n";

const MONTHS = [["T7", 62_000_000], ["T8", 68_000_000], ["T9", 75_000_000]] as const;

/** SCR-51 revenue report with the funding banner (entry C2). */
export default function Report() {
  const t = useT();
  const router = useRouter();
  const max = Math.max(...MONTHS.map((m) => m[1]));
  return (
    <SbhFrame scr="SCR-51" title="Thu chi" back={() => router.push("/so-ban-hang")} nav="Thu chi">
      <div className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <Card><div className="text-[11px] text-muted">{t("Tổng tiền thu")}</div><div className="text-base font-bold text-success">{vnd(75_000_000)}</div></Card>
          <Card><div className="text-[11px] text-muted">{t("Tổng tiền chi")}</div><div className="text-base font-bold text-danger">{vnd(58_200_000)}</div></Card>
        </div>
        <Card className="space-y-3">
          <div className="text-xs text-muted">{t("Doanh thu 3 tháng")}</div>
          <div className="flex h-24 items-end gap-4" role="img" aria-label={t("Biểu đồ doanh thu theo tháng")}>
            {MONTHS.map(([l, v]) => <div key={l} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-primary" style={{ height: `${Math.round((v / max) * 88)}px` }} /><span className="text-[10px] text-muted">{t(l)}</span></div>)}
          </div>
        </Card>
      </div>
    </SbhFrame>
  );
}
