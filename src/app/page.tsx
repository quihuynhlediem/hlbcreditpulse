"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { setCurrentFlow, setCurrentScreen } from "@/api/client";
import { Lockup } from "@/components/ui";
import { DemoChrome } from "@/components/kit/DemoChrome";
import { InspectorDrawer } from "@/components/kit/PhoneShell";
import { ENTRIES, FLOWS } from "@/lib/entries";
import { openEntry } from "@/lib/openEntry";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";
import { useT } from "@/i18n";

/** Scenario launcher (demo scaffolding, Step 19): pick a flow and entry point; the entry sets the persona. */
export default function Launcher() {
  const t = useT();
  const router = useRouter();
  const set = useFlow((s) => s.set);
  useEffect(() => { setCurrentScreen("SCR-01"); setCurrentFlow(""); }, []);
  return (
    <div data-skin="console" className="min-h-screen bg-page">
      <DemoChrome />
      <main className="mx-auto max-w-[1200px] space-y-5 px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold text-ink">HLB CreditPulse</h1>
            <p className="text-sm text-muted">{t("Chọn một luồng và điểm vào. Mỗi điểm vào mở ứng dụng đối tác với khách hàng tương ứng.")}</p>
          </div>
          <Lockup />
        </header>
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(FLOWS) as (keyof typeof FLOWS)[]).map((f) => (
            <section key={f} className="space-y-2.5 rounded-2xl bg-card p-4" aria-label={t(FLOWS[f])} data-testid={`flow-${f}`}>
              <h2 className="text-base font-bold text-ink">{t(FLOWS[f])}</h2>
              {ENTRIES.filter((e) => e.flow === f).map((e) => (
                <button key={e.id} data-testid={`entry-${e.id}`} onClick={() => openEntry(e, set, router.push)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-3 text-left hover:bg-primary-soft">
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{t(e.title)}</span>
                    <span className="block text-[11px] text-muted">{t(e.audience)}{CUSTOMER_BY_REF[e.persona] ? "" : ""}</span>
                  </span>
                  <span className="text-xs font-semibold text-primary">{t("Mở ›")}</span>
                </button>
              ))}
            </section>
          ))}
        </div>
        <section className="flex flex-wrap items-center gap-3" aria-label={t("Vận hành HLB")}>
          <span className="text-[13px] font-semibold text-ink">{t("Vận hành HLB")}:</span>
          <Link href="/creditpulse/decisions" className="rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground">{t("Bảng điều khiển CreditPulse")}</Link>
          <button onClick={() => useFlow.getState().set({ inspectorOpen: true })} className="rounded-lg border border-line bg-card px-4 py-2.5 text-[13px] font-semibold text-ink">API inspector</button>
        </section>
        <p className="text-xs text-muted">{t("Giao diện đối tác chỉ để trình bày đề xuất; chưa có hợp tác nào được ký (D-35). Số tiền và hạn mức là giá trị chính sách minh họa (D-28).")}</p>
      </main>
      <InspectorDrawer />
    </div>
  );
}
