import { track } from "@/api/track";
import { useFlow } from "@/store/flow";
import type { Entry } from "./entries";

export function openEntry(e: Entry, set: ReturnType<typeof useFlow.getState>["set"], push: (p: string) => void) {
  set({ persona: e.persona, entry: e.path, orderAmount: e.orderAmount ?? 12_000_000, offerRequestId: undefined, packageId: undefined, decisionId: undefined, contractId: undefined, loanId: undefined, amount: undefined, tenor: undefined });
  track("demo_entry_opened", { entry: e.id, persona: e.persona });
  push(e.path);
}
