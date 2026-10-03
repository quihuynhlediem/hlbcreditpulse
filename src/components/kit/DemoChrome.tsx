"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useResetDemo, useSetScenario } from "@/api/hooks";
import type { ScenarioName } from "@/api/types";
import { track } from "@/api/track";
import { CUSTOMERS } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";

export const SCENARIO_LABELS: Record<ScenarioName, string> = {
  APPROVE: "Được duyệt",
  THIN_FILE: "Hồ sơ mỏng (hạn mức khởi đầu)",
  NOT_APPROVED: "Chưa được duyệt",
  MANUAL_REVIEW: "Xem xét thủ công",
  SLOW: "Phản hồi chậm (> 3 giây)",
  EKYC_FAIL: "Lỗi eKYC",
  SOURCE_DOWN: "Một nguồn dữ liệu tạm thời không có",
  SESSION_EXPIRED: "Phiên ký hết hạn",
};

/** Demo frame strip (F-13): persona, scenario, reset, inspector toggle, mock badge toggle. */
export function DemoChrome() {
  const f = useFlow();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => { if ((window as unknown as { __hlbStorageBlocked?: boolean }).__hlbStorageBlocked) setBlocked(true); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const qc = useQueryClient();
  const router = useRouter();
  const setScenario = useSetScenario();
  const reset = useResetDemo();
  return (
    <div className="sticky top-0 z-40 border-b border-slate-300 bg-slate-900 text-slate-100" data-testid="demo-chrome">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[12px]">
        <Link href="/" className="font-bold text-white">HLB CreditPulse · demo</Link>
        <label className="flex items-center gap-1">Nhân vật
          <select className="rounded bg-slate-800 px-1.5 py-1" value={f.persona} onChange={(e) => { f.set({ persona: e.target.value }); qc.invalidateQueries(); }} aria-label="Nhân vật">
            {CUSTOMERS.map((c) => <option key={c.ref} value={c.ref}>{c.display}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">Kịch bản
          <select className="rounded bg-slate-800 px-1.5 py-1" value={f.scenario} aria-label="Kịch bản" onChange={async (e) => {
            const s = e.target.value as ScenarioName;
            f.set({ scenario: s });
            await setScenario.mutateAsync(s);
            track("demo_scenario_set", { scenario: s });
            qc.invalidateQueries();
          }}>
            {(Object.keys(SCENARIO_LABELS) as ScenarioName[]).map((s) => <option key={s} value={s}>{SCENARIO_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={f.mockBadge} onChange={(e) => f.set({ mockBadge: e.target.checked })} /> Huy hiệu mô phỏng</label>
        <button className="rounded border border-slate-600 px-2 py-1" onClick={() => { track("inspector_opened"); f.set({ inspectorOpen: !f.inspectorOpen }); }} aria-pressed={f.inspectorOpen}>API inspector</button>
        <button className="rounded border border-red-400 px-2 py-1 text-red-300" onClick={async () => {
          await reset.mutateAsync();
          const entry = f.entry;
          f.reset();
          track("demo_reset");
          qc.clear();
          router.push(entry ?? "/");
        }}>Đặt lại dữ liệu demo</button>
        {blocked && <span className="text-amber-300">Không lưu được dữ liệu trên trình duyệt này</span>}
      </div>
    </div>
  );
}
