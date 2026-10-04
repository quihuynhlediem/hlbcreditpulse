"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useResetDemo, useSetScenario } from "@/api/hooks";
import type { ScenarioName } from "@/api/types";
import { track } from "@/api/track";
import { useLocale, useT, type Locale } from "@/i18n";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";
import { usePresenter } from "@/store/presenter";

export const SCENARIO_LABELS: Record<ScenarioName, string> = {
  APPROVE: "Được duyệt",
  THIN_FILE: "Hồ sơ mỏng (hạn mức khởi đầu)",
  NOT_APPROVED: "Chưa được duyệt",
  COUNTER_OFFER: "Duyệt số tiền thấp hơn (thiết bị dùng chung)",
  SLOW: "Phản hồi chậm (> 3 giây)",
  EKYC_FAIL: "Lỗi eKYC",
  SOURCE_DOWN: "Một nguồn dữ liệu tạm thời không có",
  SESSION_EXPIRED: "Phiên ký hết hạn",
};

/**
 * Presenter bar (demo scaffolding, Step 19): read-only persona (set by the entry point), scenario, language,
 * page events, test OTP, API inspector and reset. Everything below this bar is shown as production (R-27).
 */
export function DemoChrome() {
  const t = useT();
  const f = useFlow();
  const { locale, setLocale } = useLocale();
  const events = usePresenter((s) => s.actions);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => { if ((window as unknown as { __hlbStorageBlocked?: boolean }).__hlbStorageBlocked) setBlocked(true); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const qc = useQueryClient();
  const router = useRouter();
  const setScenario = useSetScenario();
  const reset = useResetDemo();
  const persona = CUSTOMER_BY_REF[f.persona];
  const switchTo = (l: Locale) => { if (l === locale) return; setLocale(l); track("language_switched", { locale: l }); qc.invalidateQueries(); };
  return (
    <div className="sticky top-0 z-40 border-b border-slate-300 bg-slate-900 text-slate-100" data-testid="demo-chrome">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-[12px]">
        <Link href="/" className="font-bold text-white">HLB CreditPulse <span className="font-normal text-slate-400">· {t("Điều khiển trình bày")}</span></Link>
        <span className="flex items-center gap-1">{t("Nhân vật")}
          <span className="rounded bg-slate-800 px-1.5 py-1 text-slate-200" aria-label={t("Nhân vật")} data-testid="persona" data-persona={f.persona} title={t("Nhân vật do điểm vào chọn")}>{persona ? t(persona.display) : f.persona}</span>
        </span>
        <label className="flex items-center gap-1">{t("Kịch bản")}
          <select className="rounded bg-slate-800 px-1.5 py-1" value={f.scenario} aria-label={t("Kịch bản")} onChange={async (e) => {
            const s = e.target.value as ScenarioName;
            f.set({ scenario: s });
            await setScenario.mutateAsync(s);
            track("demo_scenario_set", { scenario: s });
            qc.invalidateQueries();
          }}>
            {(Object.keys(SCENARIO_LABELS) as ScenarioName[]).map((s) => <option key={s} value={s}>{t(SCENARIO_LABELS[s])}</option>)}
          </select>
        </label>
        <span className="flex overflow-hidden rounded border border-slate-600" role="group" aria-label={t("Ngôn ngữ")}>
          {(["en", "vi"] as const).map((l) => (
            <button key={l} data-testid={`lang-${l}`} aria-pressed={locale === l} onClick={() => switchTo(l)} className={locale === l ? "bg-slate-100 px-2 py-1 font-semibold text-slate-900" : "px-2 py-1 text-slate-300"}>{l.toUpperCase()}</button>
          ))}
        </span>
        <span className="rounded border border-slate-700 px-1.5 py-1 text-slate-300" data-testid="test-otp">{t("OTP thử nghiệm")}: <b className="text-white">123456</b></span>
        {events.map((a) => (
          <button key={a.id} data-testid={a.id} disabled={a.disabled} onClick={() => { track("presenter_event", { id: a.id }); a.run(); }} className="rounded border border-amber-400 px-2 py-1 text-amber-200 disabled:opacity-50">{a.label}</button>
        ))}
        <button className="rounded border border-slate-600 px-2 py-1" onClick={() => { track("inspector_opened"); f.set({ inspectorOpen: !f.inspectorOpen }); }} aria-pressed={f.inspectorOpen}>API inspector</button>
        <button className="rounded border border-red-400 px-2 py-1 text-red-300" onClick={async () => {
          await reset.mutateAsync();
          const entry = f.entry;
          f.reset();
          track("demo_reset");
          qc.clear();
          router.push(entry ?? "/");
        }}>{t("Đặt lại dữ liệu")}</button>
        {blocked && <span className="text-amber-300">{t("Không lưu được dữ liệu trên trình duyệt này")}</span>}
      </div>
    </div>
  );
}
