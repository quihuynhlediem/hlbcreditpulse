"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCreateAssessment, useOfferSet } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { track } from "@/api/track";
import { DecisionView } from "@/components/kit/Decision";
import { VmFrame } from "@/components/vm/VmFrame";
import { ErrorBox } from "@/components/ui";
import { eirText, vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";

/** SCR-27: `new` runs the assessment (loading copy), then replaces the URL with the decision id. */
export default function Decision() {
  const { decisionId } = useParams<{ decisionId: string }>();
  const router = useRouter();
  const { persona, orderAmount, offerRequestId, packageId, set } = useFlow();
  const assess = useCreateAssessment();
  const started = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const { data: offer } = useOfferSet(offerRequestId);
  const isNew = decisionId === "new";

  const run = () => {
    setErr(null);
    assess.mutate(
      { customerRef: persona, offerRequestId, packageId: packageId ?? "pkg-6", productType: "PAYMENT_INSTALLMENT", amount: { amount: orderAmount, currency: "VND" } },
      {
        onSuccess: (d) => { set({ decisionId: d.decisionId }); track("decision_returned", { outcome: d.outcome, tier: d.tier, stp: d.tier === "STP", latencyMs: d.latencyMs }); router.replace(`/viettel-money/decision/${d.decisionId}`); },
        onError: (e) => {
          if (e instanceof ApiError && e.type?.endsWith("ekyc-required")) router.replace("/viettel-money/ekyc");
          else if (e instanceof ApiError && e.type?.endsWith("consent-required")) router.replace("/viettel-money/limit");
          else setErr("Chưa có kết quả. Hồ sơ của bạn được giữ, bạn thử lại nhé.");
        },
      },
    );
  };
  useEffect(() => { if (!isNew || started.current) return; started.current = true; run(); }, [isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const pkg = offer?.packages.find((p) => p.packageId === (packageId ?? "pkg-6"));
  const terms = pkg ? `${pkg.tenorMonths} tháng · ${pkg.eir === 0 ? "0% lãi (người bán chịu)" : `EIR ${eirText(pkg.eir)}`} · Tổng ${vnd(pkg.totalPayable.amount)}` : undefined;
  return (
    <VmFrame scr="SCR-27" title="Kết quả xét duyệt" back={() => router.push("/viettel-money")}>
      {err ? <div className="p-4"><ErrorBox onRetry={() => { started.current = true; run(); }}>{err}</ErrorBox></div> : (
        <DecisionView
          decisionId={isNew ? undefined : decisionId}
          terms={terms}
          onContinue={() => router.push(`/viettel-money/contract/${decisionId}`)}
          onSmaller={() => router.push(offerRequestId ? `/viettel-money/offers/${offerRequestId}` : "/shopee/checkout")}
          onConnect={() => router.push(offerRequestId ? `/viettel-money/limit?offer=${offerRequestId}` : "/viettel-money/limit")}
          onOther={() => router.push("/shopee/checkout")}
        />
      )}
    </VmFrame>
  );
}
