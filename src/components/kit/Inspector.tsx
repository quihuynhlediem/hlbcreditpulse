"use client";
import { useApiCalls } from "@/api/hooks";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { useT } from "@/i18n";

const BUDGET_MS = 5000;

export function InspectorPanel({ flow, className }: { flow?: string; className?: string }) {
  const t = useT();
  const { data, isLoading } = useApiCalls(flow, 1500);
  const [open, setOpen] = useState<string | null>(null);
  const calls = data ?? [];
  return (
    <div className={cn("flex flex-col gap-2 text-[12px]", className)} data-testid="api-inspector">
      {isLoading && <div className="text-muted">{t("Đang tải…")}</div>}
      {!isLoading && calls.length === 0 && <div className="rounded-lg border border-line p-3 text-muted">{t("Chưa có cuộc gọi API nào.")}</div>}
      {calls.map((c) => {
        const pct = Math.min(100, Math.round((c.latencyMs / BUDGET_MS) * 100));
        const isOpen = open === c.callId;
        return (
          <div key={c.callId} className="rounded-lg border border-line bg-card" data-testid="api-call">
            <button className="flex w-full items-center gap-2 p-2 text-left" onClick={() => setOpen(isOpen ? null : c.callId)} aria-expanded={isOpen}>
              <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold", c.method === "WEBHOOK" ? "bg-warning text-white" : "bg-primary-soft text-primary")}>{c.method}</span>
              <span className="flex-1 truncate font-mono">{c.path}</span>
              <span className={cn("font-semibold", c.status >= 400 ? "text-danger" : "text-success")}>{c.status}</span>
              <span className="text-muted">{c.latencyMs} ms</span>
            </button>
            <div className="mx-2 mb-2 h-1.5 overflow-hidden rounded bg-line" title={t("Độ trễ so với ngân sách 5 giây (D-34)")}>
              <div className={cn("h-full", c.latencyMs > 3000 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
            </div>
            {c.screen && <div className="px-2 pb-1 text-muted">{t("Màn hình: {0}", c.screen)}</div>}
            {isOpen && (
              <div className="space-y-1 border-t border-line p-2">
                <div className="text-muted">Idempotency-Key: <span className="font-mono">{c.idempotencyKey}</span></div>
                <pre className="max-h-40 overflow-auto rounded bg-page p-2 font-mono text-[11px]">{JSON.stringify({ request: c.request, response: c.response }, null, 2)}</pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
