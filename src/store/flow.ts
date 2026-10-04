"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScenarioName } from "@/api/types";

const DEFAULT_ORDER_AMOUNT = 12_000_000;

interface FlowState {
  persona: string;
  scenario: ScenarioName;
  inspectorOpen: boolean;
  entry?: string;
  ekycDone: Record<string, boolean>;
  orderAmount: number;
  offerRequestId?: string;
  packageId?: string;
  decisionId?: string;
  contractId?: string;
  loanId?: string;
  amount?: number; // driver / seller requested amount
  tenor?: number;
  set: (p: Partial<Omit<FlowState, "set" | "reset">>) => void;
  reset: () => void;
}

const initial = { persona: "cus_mai", scenario: "APPROVE" as ScenarioName, inspectorOpen: false, ekycDone: {} as Record<string, boolean>, orderAmount: DEFAULT_ORDER_AMOUNT };

export const useFlow = create<FlowState>()(
  persist(
    (set) => ({ ...initial, set: (p) => set(p), reset: () => set({ ...initial }) }),
    { name: "hlb-flow-v1" },
  ),
);
