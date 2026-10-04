"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, idem, unwrap } from "./client";
import type { components } from "./schema";

type S = components["schemas"];

/* ---- queries ---- */
export const useOfferSet = (id?: string) =>
  useQuery({ queryKey: ["offer", id], enabled: !!id, queryFn: () => unwrap(client.GET("/api/v1/offers/{offerRequestId}", { params: { path: { offerRequestId: id! } } })) });

export const useConsents = (customerRef?: string) =>
  useQuery({ queryKey: ["consents", customerRef], enabled: !!customerRef, queryFn: () => unwrap(client.GET("/api/v1/customers/{customerRef}/consents", { params: { path: { customerRef: customerRef! } } })) });

export const useLimitLadder = (customerRef?: string) =>
  useQuery({ queryKey: ["ladder", customerRef], enabled: !!customerRef, queryFn: () => unwrap(client.GET("/api/v1/customers/{customerRef}/limit-ladder", { params: { path: { customerRef: customerRef! } } })) });

export const useDecision = (id?: string) =>
  useQuery({ queryKey: ["decision", id], enabled: !!id, queryFn: () => unwrap(client.GET("/api/v1/decisions/{decisionId}", { params: { path: { decisionId: id! } } })) });

export const useLoans = (customerRef?: string) =>
  useQuery({ queryKey: ["loans", customerRef], enabled: !!customerRef, queryFn: () => unwrap(client.GET("/api/v1/customers/{customerRef}/loans", { params: { path: { customerRef: customerRef! } } })) });

export const useSettlementQuote = (loanId?: string, enabled = false) =>
  useQuery({ queryKey: ["quote", loanId], enabled: !!loanId && enabled, queryFn: () => unwrap(client.GET("/api/v1/loans/{loanId}/settlement-quote", { params: { path: { loanId: loanId! } } })) });

export const useGraduation = (customerRef?: string) =>
  useQuery({ queryKey: ["graduation", customerRef], enabled: !!customerRef, queryFn: () => unwrap(client.GET("/api/v1/customers/{customerRef}/graduation-offer", { params: { path: { customerRef: customerRef! } } })) });

export const useDecisions = (q: { partnerId?: string; outcome?: string } = {}) =>
  useQuery({ queryKey: ["decisions", q], queryFn: () => unwrap(client.GET("/api/v1/console/decisions", { params: { query: { page: 0, size: 50, ...q } as never } })) });

export const useRanking = () => useQuery({ queryKey: ["ranking"], queryFn: () => unwrap(client.GET("/api/v1/console/data-sources/ranking")) });
export const useAppeals = () => useQuery({ queryKey: ["appeals"], queryFn: () => unwrap(client.GET("/api/v1/console/appeals")) });
export const useLearningLoop = () => useQuery({ queryKey: ["learning"], queryFn: () => unwrap(client.GET("/api/v1/console/learning-loop")) });
export const useConsentLedger = () => useQuery({ queryKey: ["ledger"], queryFn: () => unwrap(client.GET("/api/v1/console/consent-ledger")) });
export const useTia = () => useQuery({ queryKey: ["tia"], queryFn: () => unwrap(client.GET("/api/v1/console/tia")) });
export const usePolicy = () => useQuery({ queryKey: ["policy"], queryFn: () => unwrap(client.GET("/api/v1/console/policies")) });
export const useAuditLog = () => useQuery({ queryKey: ["audit"], queryFn: () => unwrap(client.GET("/api/v1/console/audit-log")) });
export const usePartners = () => useQuery({ queryKey: ["partners"], queryFn: () => unwrap(client.GET("/api/v1/console/partners")) });
export const useApiCalls = (flow?: string, refetchInterval?: number | false) =>
  useQuery({ queryKey: ["apicalls", flow], refetchInterval, queryFn: () => unwrap(client.GET("/api/v1/console/api-calls", { params: { query: flow ? { flow } : {} } })) });

/* ---- mutations ---- */
function useInvalidating<TVars, TData>(fn: (v: TVars) => Promise<TData>, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const k of keys) qc.invalidateQueries({ queryKey: [k] });
    },
  });
}

export const useCreatePrescreen = () => useMutation({ mutationFn: (b: S["PrescreenRequest"]) => unwrap(client.POST("/api/v1/prescreens", { params: { header: idem() }, body: b })) });
export const useCreateOffer = () => useInvalidating((b: S["OfferRequestCreate"]) => unwrap(client.POST("/api/v1/offers", { params: { header: idem() }, body: b })), ["offer", "ladder"]);
export const useCreateConsent = () => useInvalidating((b: S["ConsentCreate"]) => unwrap(client.POST("/api/v1/consents", { params: { header: idem() }, body: b })), ["consents", "ladder", "ledger"]);
export const useWithdrawConsent = () => useInvalidating((receiptId: string) => unwrap(client.POST("/api/v1/consents/{receiptId}/withdraw", { params: { path: { receiptId }, header: idem() } })), ["consents", "ladder", "ledger"]);
export const useCreateEkyc = () => useInvalidating((b: S["EkycRequest"]) => unwrap(client.POST("/api/v1/ekyc/verifications", { params: { header: idem() }, body: b })), ["ladder"]);
export const useCreateAssessment = () => useInvalidating((b: S["AssessmentCreate"]) => unwrap(client.POST("/api/v1/assessments", { params: { header: idem() }, body: b })), ["decision", "ladder", "decisions", "appeals"]);
export const useCreateContract = () => useMutation({ mutationFn: (b: S["ContractCreate"]) => unwrap(client.POST("/api/v1/contracts", { params: { header: idem() }, body: b })) });
export const useSignContract = () => useInvalidating((v: { contractId: string; otp: string }) => unwrap(client.POST("/api/v1/contracts/{contractId}/sign", { params: { path: { contractId: v.contractId }, header: idem() }, body: { otp: v.otp } })), ["loans", "decisions", "graduation"]);
export const useCreatePayment = () => useInvalidating((v: { loanId: string; amount: S["Money"] }) => unwrap(client.POST("/api/v1/loans/{loanId}/payments", { params: { path: { loanId: v.loanId }, header: idem() }, body: { amount: v.amount } })), ["loans", "graduation"]);
export const useRefundEvent = () => useInvalidating((b: S["RefundEvent"]) => unwrap(client.POST("/api/v1/webhooks/refunds", { params: { header: { "X-CreditPulse-Signature": demoSignature() } }, body: b })), ["loans", "apicalls"]);
export const useCreateAppeal = () => useInvalidating((v: { decisionId: string; note?: string }) => unwrap(client.POST("/api/v1/decisions/{decisionId}/appeals", { params: { path: { decisionId: v.decisionId }, header: idem() }, body: { note: v.note } })), ["decision", "appeals", "decisions"]);
export const useDecideAppeal = () => useInvalidating((v: { appealId: string; outcome: "UPHELD" | "OVERTURNED"; reasonCode: string; amount?: number }) => unwrap(client.POST("/api/v1/console/appeals/{appealId}/decision", { params: { path: { appealId: v.appealId } }, body: { outcome: v.outcome, reasonCode: v.reasonCode, ...(v.amount ? { newOfferAmount: { amount: v.amount, currency: "VND" as const } } : {}) } })), ["appeals", "decisions", "decision", "audit"]);
export const useRequestAppealInfo = () => useInvalidating((v: { appealId: string; message: string }) => unwrap(client.POST("/api/v1/console/appeals/{appealId}/information-request", { params: { path: { appealId: v.appealId } }, body: { message: v.message } })), ["appeals"]);
export const useRotateCredential = () => useMutation({ mutationFn: (partnerId: string) => unwrap(client.POST("/api/v1/console/partners/{partnerId}/credentials", { params: { path: { partnerId } }, body: { environment: "sandbox", mtlsCertificatePem: "-----BEGIN CERTIFICATE-----\nMIIB…\n-----END CERTIFICATE-----" } })) });
export const useSendTestWebhook = () => useInvalidating((partnerId: "viettel-money" | "grab" | "so-ban-hang") => unwrap(client.POST("/api/v1/console/partners/{partnerId}/test-webhook", { params: { path: { partnerId } } })), ["apicalls"]);
export const useSetScenario = () => useMutation({ mutationFn: (scenario: S["ScenarioName"]) => client.POST("/api/v1/demo/scenario", { body: { scenario } }) });
export const useResetDemo = () => useMutation({ mutationFn: () => client.POST("/api/v1/demo/reset") });

/** Demo stand-in for the partner's HMAC signature on inbound events (the product verifies it, AC-33.4). */
function demoSignature() { return `t=${Math.floor(Date.now() / 1000)},v1=demo`; }

/* ---- maker-checker (US-63, US-60, US-64) ---- */
export const useApprovals = () => useQuery({ queryKey: ["approvals"], queryFn: () => unwrap(client.GET("/api/v1/console/approvals", { params: { query: { page: 0, size: 50 } } })) });
/** Creates a policy draft (weights, guardrails or test band) and submits it for approval. */
export const useProposePolicy = () =>
  useInvalidating(async (v: { config: Record<string, unknown>; reason: string }) => {
    const draft = await unwrap(client.POST("/api/v1/console/policy-versions", { body: { productType: "PAYMENT_INSTALLMENT", config: v.config, reason: v.reason } }));
    return unwrap(client.POST("/api/v1/console/policy-versions/{versionId}/submit", { params: { path: { versionId: draft.policyVersionId } }, body: { reason: v.reason } }));
  }, ["approvals"]);
export const useRequestModelMode = () =>
  useInvalidating((v: { modelVersionId: string; reason: string }) => unwrap(client.POST("/api/v1/console/models/{modelVersionId}/mode", { params: { path: { modelVersionId: v.modelVersionId } }, body: { mode: "champion", reason: v.reason } })), ["approvals"]);
/** Approves as the demo Checker (a different staff member from the maker; demo-only actor header). */
export const useApproveChange = () =>
  useInvalidating((approvalId: string) => unwrap(client.POST("/api/v1/console/approvals/{approvalId}/approve", { params: { path: { approvalId } }, body: {}, headers: { "x-demo-actor": "checker.demo@hlb" } })), ["approvals", "policy", "ranking", "learning", "audit", "appeals", "decision", "decisions"]);
/** Tries to approve as the maker — the product refuses (AC-60.2); used to show the rule in the demo. */
export const useSelfApprove = () =>
  useMutation({ mutationFn: (approvalId: string) => unwrap(client.POST("/api/v1/console/approvals/{approvalId}/approve", { params: { path: { approvalId } }, body: {} })) });
