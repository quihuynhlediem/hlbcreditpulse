"use client";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { setCurrentFlow, setCurrentScreen } from "@/api/client";
import { useT } from "@/i18n";
import { useFlow } from "@/store/flow";
import { DemoChrome } from "./DemoChrome";
import { InspectorPanel } from "./Inspector";

export type Skin = "viettel" | "shopee" | "grab" | "sbh" | "console";

/** Registers the current screen and flow for the API inspector. */
export function useScreen(scr: string, flow: string) {
  useEffect(() => {
    setCurrentScreen(scr);
    setCurrentFlow(flow);
  }, [scr, flow]);
}

export function InspectorDrawer({ flow }: { flow?: string }) {
  const t = useT();
  const open = useFlow((s) => s.inspectorOpen);
  const set = useFlow((s) => s.set);
  if (!open) return null;
  return (
    <aside className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-[420px] overflow-y-auto border-l border-line bg-white p-3 shadow-2xl" aria-label="API inspector">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">API inspector (SCR-70)</h2>
        <button className="text-xs text-slate-600" onClick={() => set({ inspectorOpen: false })}>{t("Đóng")}</button>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">{t("Màn hình thuộc đối tác; quyết định thuộc HLB. Độ trễ so với ngân sách 5 giây (D-34).")}</p>
      <InspectorPanel flow={flow} />
    </aside>
  );
}

export function PhoneShell({ skin, scr, flow, children, footer, status = true, className }: { skin: Skin; scr: string; flow: string; children: React.ReactNode; footer?: React.ReactNode; status?: boolean; className?: string }) {
  useScreen(scr, flow);
  return (
    <div data-skin={skin} data-scr={scr} className="min-h-screen bg-slate-200">
      <DemoChrome />
      <div className="mx-auto flex justify-center md:py-5">
        <div className={cn("relative flex h-[calc(100dvh-44px)] w-full flex-col overflow-hidden bg-page md:h-[844px] md:w-[390px] md:rounded-[34px] md:border-[10px] md:border-slate-900 md:shadow-2xl", className)}>
          {status && (
            <div className="flex shrink-0 items-center justify-between bg-card px-5 pb-1 pt-2.5 text-[13px] font-semibold text-ink" data-skin-status>
              <span>9:41</span>
              <span className="text-xs font-medium text-muted">5G 100%</span>
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
          {footer}
        </div>
      </div>
      <InspectorDrawer flow={flow} />
    </div>
  );
}

/** A simple screen header: white bar with a back chevron and a title. */
export function Header({ title, onBack, tone = "light" }: { title: string; onBack?: () => void; tone?: "light" | "brand" }) {
  const t = useT();
  return (
    <div className={cn("flex shrink-0 items-center gap-3 px-4 py-3", tone === "brand" ? "bg-primary text-primary-foreground" : "bg-card text-ink")}>
      {onBack && <button onClick={onBack} aria-label={t("Quay lại")} className={cn("text-2xl leading-none", tone === "brand" ? "text-primary-foreground" : "text-primary")}>‹</button>}
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
}

export function BottomBar({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 space-y-2.5 border-t border-line bg-card px-4 py-3">{children}</div>;
}
