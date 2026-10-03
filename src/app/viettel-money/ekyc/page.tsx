"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EkycFlow } from "@/components/kit/Ekyc";
import { VmFrame } from "@/components/vm/VmFrame";
import { useFlow } from "@/store/flow";

function Ekyc() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { persona, ekycDone, set } = useFlow();
  return (
    <VmFrame scr="SCR-25" title="Xác thực danh tính" back={() => router.back()}>
      <EkycFlow
        customerRef={persona}
        onPassed={() => { set({ ekycDone: { ...ekycDone, [persona]: true } }); router.push(next === "limit" ? "/viettel-money/limit?from=hub" : "/viettel-money/decision/new"); }}
        onCancel={() => router.push("/shopee/checkout")}
      />
    </VmFrame>
  );
}
export default function Page() { return <Suspense><Ekyc /></Suspense>; }
