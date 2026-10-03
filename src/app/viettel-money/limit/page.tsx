"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useLimitLadder } from "@/api/hooks";
import type { SourceId } from "@/api/types";
import { ConsentSheet } from "@/components/kit/Consent";
import { LadderView } from "@/components/kit/Ladder";
import { Btn, Lockup } from "@/components/ui";
import { VmFrame } from "@/components/vm/VmFrame";
import { vnd } from "@/lib/format";
import { CUSTOMER_BY_REF, SOURCE_BY_ID } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";

/** SCR-26 limit hub (also entry A3): connect one source at a time; every rise names the data that caused it. */
function Limit() {
  const router = useRouter();
  const q = useSearchParams();
  const offer = q.get("offer");
  const hub = q.get("from") === "hub";
  const { persona, ekycDone } = useFlow();
  const done = ekycDone[persona] ?? CUSTOMER_BY_REF[persona]?.ekycDone ?? false;
  const [source, setSource] = useState<SourceId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { data } = useLimitLadder(persona);
  const prev = useRef<number | undefined>(undefined);
  const last = useRef<SourceId | null>(null);
  useEffect(() => {
    if (!data) return;
    const cur = data.currentLimit.amount;
    if (prev.current !== undefined && cur > prev.current && last.current) setToast(`Hạn mức tăng lên ${vnd(cur)} nhờ ${SOURCE_BY_ID[last.current].name.toLowerCase()}`);
    prev.current = cur;
  }, [data]);
  const partner = "Viettel Money";
  return (
    <VmFrame scr="SCR-26" title="Hạn mức trả góp HLB" back={() => router.push(offer ? `/viettel-money/offers/${offer}` : "/viettel-money")} footer={<><Lockup />{offer && <Btn onClick={() => router.push(`/viettel-money/offers/${offer}`)}>Quay lại gói trả góp</Btn>}</>}>
      {toast && <div role="status" className="mx-4 mt-3 rounded-xl bg-success/10 p-3 text-[13px] font-semibold text-success" data-testid="limit-toast">{toast}</div>}
      <LadderView customerRef={persona} ekycDone={hub ? done : undefined} onVerify={() => router.push("/viettel-money/ekyc?next=limit")} onConnect={(s) => setSource(s)} />
      {source && (
        <ConsentSheet
          sourceId={source} customerRef={persona} partnerId="viettel-money" partnerName={partner} stepLabel="Nguồn dữ liệu"
          declineHint={`Không kết nối thì hạn mức giữ ở ${vnd(data?.currentLimit.amount ?? 0)}`}
          onGranted={() => { last.current = source; setSource(null); }}
          onDeclined={() => setSource(null)}
        />
      )}
    </VmFrame>
  );
}
export default function Page() { return <Suspense><Limit /></Suspense>; }
