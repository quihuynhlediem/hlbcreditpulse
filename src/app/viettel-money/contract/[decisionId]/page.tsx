"use client";
import { useParams, useRouter } from "next/navigation";
import { ContractView } from "@/components/kit/Contract";
import { VmFrame } from "@/components/vm/VmFrame";
import { DEFAULT_ORDER, useFlow } from "@/store/flow";

export default function Contract() {
  const { decisionId } = useParams<{ decisionId: string }>();
  const router = useRouter();
  const { packageId, set } = useFlow();
  return (
    <VmFrame scr="SCR-28" title="Hợp đồng trả góp" back={() => router.back()}>
      <ContractView
        decisionId={decisionId} packageId={packageId}
        onSigned={(loan) => { set({ loanId: loan.loanId }); router.push(`/shopee/orders/${DEFAULT_ORDER.orderRef}?result=paid`); }}
        onCancel={() => router.push(`/shopee/orders/${DEFAULT_ORDER.orderRef}?result=cancelled`)}
      />
    </VmFrame>
  );
}
