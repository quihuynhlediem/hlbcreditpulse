"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getDb, saveDb } from "@/mocks/db";
import type { ScenarioName } from "@/api/types";
import { restoreLocale, setLocale, t } from "@/i18n";
import { useFlow } from "@/store/flow";

const MOCK = process.env.NEXT_PUBLIC_API_MODE !== "live";
const SCENARIOS: Record<string, ScenarioName> = { default: "APPROVE", approve: "APPROVE", thin_file: "THIN_FILE", not_approved: "NOT_APPROVED", counter_offer: "COUNTER_OFFER", slow: "SLOW", ekyc_fail: "EKYC_FAIL" };

/** Some browsers throw when localStorage is touched (blocked site data). The mock layer needs a Storage object, so fall back to memory and flag it (AC-02.3). */
function ensureStorage() {
  try { void window.localStorage; return; } catch { /* blocked */ }
  const mem = new Map<string, string>();
  const shim = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
  Object.defineProperty(window, "localStorage", { configurable: true, value: shim });
  (window as unknown as { __hlbStorageBlocked?: boolean }).__hlbStorageBlocked = true;
}

let workerStarted: Promise<unknown> | null = null;
function startWorker() {
  // React StrictMode runs effects twice in dev; start the worker exactly once.
  ensureStorage();
  workerStarted ??= import("@/mocks/browser").then(({ worker }) => worker.start({ onUnhandledRequest: "bypass", quiet: true }));
  return workerStarted;
}

/** Starts the MSW browser worker in mock mode and applies ?scenario= before rendering children. */
function MswGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCK);
  useEffect(() => {
    if (!MOCK) { restoreLocale(); return; }
    let cancelled = false;
    (async () => {
      await startWorker();
      const params = new URLSearchParams(window.location.search);
      const lang = params.get("lang");
      if (lang === "vi" || lang === "en") await setLocale(lang);
      else restoreLocale();
      const q = params.get("scenario");
      const db = getDb();
      if (q) {
        if (q.startsWith("error-")) db.errorOp = q.slice(6);
        else if (q === "empty") db.emptyMode = true;
        else if (SCENARIOS[q]) { db.scenario = SCENARIOS[q]; useFlow.getState().set({ scenario: SCENARIOS[q] }); }
        saveDb();
      } else {
        db.scenario = useFlow.getState().scenario;
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);
  if (!ready) return <div className="min-h-screen grid place-items-center text-sm text-slate-500" role="status">{t("Đang tải…")}</div>;
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 0 } } }));
  return (
    <QueryClientProvider client={qc}>
      <MswGate>{children}</MswGate>
    </QueryClientProvider>
  );
}
