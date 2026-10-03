"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { openEntry } from "@/lib/openEntry";
import { ENTRY_BY_ID } from "@/lib/entries";
import { CUSTOMER_BY_REF } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";

/** Deep link: /demo/{flow}/{entry}?persona=… Unknown entries land back on the launcher message (AC-01.3). */
export default function DeepLink() {
  const { flow, entry } = useParams<{ flow: string; entry: string }>();
  const q = useSearchParams();
  const router = useRouter();
  const set = useFlow((s) => s.set);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    const e = ENTRY_BY_ID[String(entry).toUpperCase()];
    const persona = q.get("persona");
    if (!e || e.flow !== String(flow).toUpperCase() || (persona && !CUSTOMER_BY_REF[persona])) { setBad(true); return; } // eslint-disable-line react-hooks/set-state-in-effect
    openEntry(persona ? { ...e, persona } : e, set, (p) => router.replace(p));
  }, [flow, entry, q, router, set]);
  if (!bad) return <div className="grid min-h-screen place-items-center text-sm text-slate-500" role="status">Đang mở kịch bản…</div>;
  return (
    <div data-skin="console" className="grid min-h-screen place-items-center bg-page p-6">
      <div className="max-w-sm space-y-3 rounded-2xl bg-card p-6 text-center">
        <p role="alert" className="font-semibold text-ink">Không tìm thấy kịch bản. Chọn một luồng để bắt đầu.</p>
        <Link href="/" className="inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Về trang chọn kịch bản</Link>
      </div>
    </div>
  );
}
