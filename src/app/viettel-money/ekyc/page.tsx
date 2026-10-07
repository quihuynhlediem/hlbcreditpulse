"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EkycFlow } from "@/components/kit/Ekyc";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useWallet } from "@/lib/wallet";
import { useFlow } from "@/store/flow";
import { tKey } from "@/i18n";

function Ekyc() {
  const w = useWallet();
  const B = w.base;
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { persona, ekycDone, set } = useFlow();
  return (
    <WalletFrame scr="SCR-25" title={tKey("Xác thực danh tính")} back={() => router.back()}>
      <EkycFlow
        customerRef={persona}
        onPassed={() => { set({ ekycDone: { ...ekycDone, [persona]: true } }); router.push(next === "limit" ? `${B}/limit?from=hub` : `${B}/decision/new`); }}
        onCancel={() => router.push("/shopee/checkout")}
      />
    </WalletFrame>
  );
}
export default function Page() { return <Suspense><Ekyc /></Suspense>; }
