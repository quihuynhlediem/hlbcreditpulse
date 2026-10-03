"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScreen, InspectorDrawer } from "@/components/kit/PhoneShell";
import { DemoChrome } from "@/components/kit/DemoChrome";
import { Lockup } from "@/components/ui";
import { cn } from "@/lib/cn";

export const NAV = [
  ["Nhật ký quyết định", "/creditpulse/decisions", "SCR-60"],
  ["Xếp hạng dữ liệu", "/creditpulse/ranking", "SCR-62"],
  ["Hàng chờ thủ công", "/creditpulse/manual", "SCR-63"],
  ["Học liên tục", "/creditpulse/learning", "SCR-64"],
  ["Đồng ý và TIA", "/creditpulse/consent", "SCR-65"],
  ["Hạn mức và rủi ro", "/creditpulse/guardrails", "SCR-66"],
  ["Đối tác và webhook", "/creditpulse/partners", "SCR-67"],
] as const;

/** HLB operator console (internal back-office): desktop layout with side navigation. */
export function ConsoleFrame({ scr, title, subtitle, actions, children }: { scr: string; title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  useScreen(scr, "console");
  const path = usePathname();
  return (
    <div data-skin="console" data-scr={scr} className="min-h-screen bg-page text-ink">
      <DemoChrome />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-3 py-4 md:flex-row">
        <aside className="shrink-0 md:w-56">
          <div className="mb-3 flex items-center gap-2"><Lockup /></div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">CreditPulse · bảng điều khiển</div>
          <nav aria-label="Bảng điều khiển" className="flex flex-row flex-wrap gap-1 md:flex-col">
            {NAV.map(([l, href, s]) => (
              <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined} className={cn("rounded-lg px-3 py-2 text-[13px]", path.startsWith(href) ? "bg-primary font-semibold text-primary-foreground" : "bg-card text-ink hover:bg-primary-soft")}>
                {l}<span className="ml-1 text-[10px] opacity-70">{s}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 space-y-4">
          <header className="flex flex-wrap items-end justify-between gap-2">
            <div><h1 className="text-xl font-bold">{title}</h1>{subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}</div>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </header>
          {children}
        </main>
      </div>
      <InspectorDrawer flow="console" />
    </div>
  );
}

export function Table({ head, children, testId }: { head: string[]; children: React.ReactNode; testId?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card" data-testid={testId} tabIndex={0} role="region" aria-label="Bảng dữ liệu">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="bg-primary-soft text-[11px] uppercase tracking-wide text-muted"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
