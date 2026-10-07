"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCreateAssessment, useOfferSet } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { track } from "@/api/track";
import { DecisionView } from "@/components/kit/Decision";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useWallet } from "@/lib/wallet";
import { ErrorBox } from "@/components/ui";
import { eirText, vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";
import { useT, tKey } from "@/i18n";

/** SCR-27: `new` runs the assessment (loading copy), then replaces the URL with the decision id. */
export default function Decision() {
  const w = useWallet();
  const B = w.base;
  const t = useT();
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
        onSuccess: (d) => { set({ decisionId: d.decisionId }); track("decision_returned", { outcome: d.outcome, latencyMs: d.latencyMs }); router.replace(`${B}/decision/${d.decisionId}`); },
        onError: (e) => {
          if (e instanceof ApiError && e.type?.endsWith("ekyc-required")) router.replace(`${B}/ekyc`);
          else if (e instanceof ApiError && e.type?.endsWith("consent-required")) router.replace(`${B}/limit`);
          else setErr(tKey("Chưa có kết quả. Hồ sơ của bạn được giữ, bạn thử lại nhé."));
        },
      },
    );
  };
  useEffect(() => { if (!isNew || started.current) return; started.current = true; run(); }, [isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const pkg = offer?.packages.find((p) => p.packageId === (packageId ?? "pkg-6"));
  const terms = !pkg ? undefined : pkg.eir === 0
    ? tKey("{0} tháng · 0% lãi (người bán chịu) · Tổng {1}", pkg.tenorMonths, vnd(pkg.totalPayable.amount))
    : tKey("{0} tháng · EIR {1} · Tổng {2}", pkg.tenorMonths, eirText(pkg.eir), vnd(pkg.totalPayable.amount));
  return (
    <WalletFrame scr="SCR-27" title={tKey("Kết quả xét duyệt")} back={() => router.push(`${B}`)}>
      {err ? <div className="p-4"><ErrorBox onRetry={() => { started.current = true; run(); }}>{t(err)}</ErrorBox></div> : (
        <DecisionView
          decisionId={isNew ? undefined : decisionId}
          terms={terms}
          onContinue={() => router.push(`${B}/contract/${decisionId}`)}
          onSmaller={() => router.push(offerRequestId ? `${B}/offers/${offerRequestId}` : "/shopee/checkout")}
          onConnect={() => router.push(offerRequestId ? `${B}/limit?offer=${offerRequestId}` : `${B}/limit`)}
          onOther={() => router.push("/shopee/checkout")}
        />
      )}
    </WalletFrame>
  );
}
