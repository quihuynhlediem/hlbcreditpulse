"use client";
import { useParams, useRouter } from "next/navigation";
import { ContractView } from "@/components/kit/Contract";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useFlow } from "@/store/flow";
import { useOrder } from "@/lib/wallet";

export default function Contract() {
  const order = useOrder();
  const { decisionId } = useParams<{ decisionId: string }>();
  const router = useRouter();
  const { packageId, set } = useFlow();
  return (
    <WalletFrame scr="SCR-28" title="Hợp đồng trả góp" back={() => router.back()}>
      <ContractView
        decisionId={decisionId} packageId={packageId}
        onSigned={(loan) => { set({ loanId: loan.loanId }); router.push(`/shopee/orders/${order.orderRef}?result=paid`); }}
        onCancel={() => router.push(`/shopee/orders/${order.orderRef}?result=cancelled`)}
      />
    </WalletFrame>
  );
}
