"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, unwrap } from "./client";
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
export const useManualQueue = () => useQuery({ queryKey: ["manual"], queryFn: () => unwrap(client.GET("/api/v1/console/manual-queue")) });
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

export const useCreatePrescreen = () => useMutation({ mutationFn: (b: S["PrescreenRequest"]) => unwrap(client.POST("/api/v1/prescreens", { body: b })) });
export const useCreateOffer = () => useInvalidating((b: S["OfferRequestCreate"]) => unwrap(client.POST("/api/v1/offers", { body: b })), ["offer", "ladder"]);
export const useCreateConsent = () => useInvalidating((b: S["ConsentCreate"]) => unwrap(client.POST("/api/v1/consents", { body: b })), ["consents", "ladder", "ledger"]);
export const useWithdrawConsent = () => useInvalidating((receiptId: string) => unwrap(client.POST("/api/v1/consents/{receiptId}/withdraw", { params: { path: { receiptId } } })), ["consents", "ladder", "ledger"]);
export const useCreateEkyc = () => useInvalidating((b: S["EkycRequest"]) => unwrap(client.POST("/api/v1/ekyc/verifications", { body: b })), ["ladder"]);
export const useCreateAssessment = () => useInvalidating((b: S["AssessmentCreate"]) => unwrap(client.POST("/api/v1/assessments", { body: b })), ["decision", "ladder", "decisions", "manual"]);
export const useCreateContract = () => useMutation({ mutationFn: (b: S["ContractCreate"]) => unwrap(client.POST("/api/v1/contracts", { body: b })) });
export const useSignContract = () => useInvalidating((v: { contractId: string; otp: string }) => unwrap(client.POST("/api/v1/contracts/{contractId}/sign", { params: { path: { contractId: v.contractId } }, body: { otp: v.otp } })), ["loans", "decisions", "graduation"]);
export const useCreatePayment = () => useInvalidating((v: { loanId: string; amount: S["Money"] }) => unwrap(client.POST("/api/v1/loans/{loanId}/payments", { params: { path: { loanId: v.loanId } }, body: { amount: v.amount } })), ["loans", "graduation"]);
export const useRefundEvent = () => useInvalidating((b: S["RefundEvent"]) => unwrap(client.POST("/api/v1/webhooks/refunds", { body: b })), ["loans", "apicalls"]);
export const usePayoutEvent = () => useInvalidating((b: S["PayoutEvent"]) => unwrap(client.POST("/api/v1/webhooks/payouts", { body: b })), ["loans"]);
export const useSettlementEvent = () => useInvalidating((b: S["SettlementEvent"]) => unwrap(client.POST("/api/v1/webhooks/settlements", { body: b })), ["loans"]);
export const useUpdateRanking = () => useInvalidating((b: S["RankingWeights"]) => unwrap(client.PUT("/api/v1/console/data-sources/ranking", { body: b })), ["ranking", "audit"]);
export const useResolveManual = () => useInvalidating((v: { caseId: string; action: "APPROVE" | "DECLINE"; reasonCode: string }) => unwrap(client.POST("/api/v1/console/manual-queue/{caseId}/resolution", { params: { path: { caseId: v.caseId } }, body: { action: v.action, reasonCode: v.reasonCode } })), ["manual", "decisions"]);
export const useUpdatePolicy = () => useInvalidating((b: S["Policy"]) => unwrap(client.PUT("/api/v1/console/policies", { body: b })), ["policy", "learning", "audit"]);
export const useSendTestWebhook = () => useInvalidating((partnerId: "viettel-money" | "grab" | "so-ban-hang") => unwrap(client.POST("/api/v1/console/partners/{partnerId}/test-webhook", { params: { path: { partnerId } } })), ["apicalls"]);
export const useSetScenario = () => useMutation({ mutationFn: (scenario: S["ScenarioName"]) => client.POST("/api/v1/demo/scenario", { body: { scenario } }) });
export const useResetDemo = () => useMutation({ mutationFn: () => client.POST("/api/v1/demo/reset") });
