"use client";
import Link from "next/link";
import { useState } from "react";
import { useDecisions } from "@/api/hooks";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { Chip, ErrorBox, Skel } from "@/components/ui";
import { dmy, vnd } from "@/lib/format";
import { OUTCOME_NAMES, PARTNER_NAMES, PRODUCT_NAMES } from "@/lib/names";

/** SCR-60 decision log. Latency above the 5 s budget (D-34) is flagged. */
export default function Decisions() {
  const [partnerId, setPartner] = useState("");
  const [outcome, setOutcome] = useState("");
  const q = useDecisions({ ...(partnerId && { partnerId }), ...(outcome && { outcome }) });
  const csv = () => {
    const rows = [["decisionId", "customer", "partner", "product", "amount", "tier", "outcome", "latencyMs"], ...(q.data?.items ?? []).map((d) => [d.decisionId, d.customerMask, d.partnerId, d.productType, d.amount.amount, d.tier, d.outcome, d.latencyMs])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "creditpulse-decisions.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <ConsoleFrame scr="SCR-60" title="Nhật ký quyết định" subtitle="Mỗi quyết định tín dụng do CreditPulse trả về cho đối tác. Khách hàng được che thông tin." actions={<button onClick={csv} className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] font-semibold">Xuất CSV</button>}>
      <div className="flex flex-wrap gap-3 text-[13px]">
        <label className="flex items-center gap-2">Đối tác
          <select value={partnerId} onChange={(e) => setPartner(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1.5"><option value="">Tất cả</option>{Object.entries(PARTNER_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="flex items-center gap-2">Kết quả
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1.5"><option value="">Tất cả</option>{Object.entries(OUTCOME_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
      </div>
      {q.isError ? <ErrorBox onRetry={() => q.refetch()}>Không tải được nhật ký. Thử lại.</ErrorBox> : q.isLoading ? <div className="space-y-2" aria-busy><Skel className="h-10" /><Skel className="h-10" /><Skel className="h-10" /></div> : q.data!.items.length === 0 ? (
        <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="empty">Chưa có quyết định nào. Chạy một kịch bản demo.</p>
      ) : (
        <Table testId="decision-table" head={["Thời gian", "Khách hàng", "Đối tác", "Sản phẩm", "Số tiền", "Tầng", "Kết quả", "Độ trễ"]}>
          {q.data!.items.map((d) => (
            <tr key={d.decisionId} data-testid="decision-row" className="hover:bg-primary-soft">
              <td className="px-3 py-2">{dmy(d.decidedAt)}</td>
              <td className="px-3 py-2"><Link href={`/creditpulse/decisions/${d.decisionId}`} className="font-semibold text-primary underline">{d.customerMask}</Link></td>
              <td className="px-3 py-2">{PARTNER_NAMES[d.partnerId]}</td>
              <td className="px-3 py-2">{PRODUCT_NAMES[d.productType]}</td>
              <td className="px-3 py-2">{vnd(d.amount.amount)}</td>
              <td className="px-3 py-2"><Chip tone={d.tier === "STP" ? "success" : "warning"}>{d.tier}</Chip></td>
              <td className="px-3 py-2">{OUTCOME_NAMES[d.outcome]}</td>
              <td className="px-3 py-2">{d.latencyMs ? `${d.latencyMs} ms` : "—"}{d.latencyMs > 5000 && <span className="ml-1 font-semibold text-danger"> vượt 5 s</span>}</td>
            </tr>
          ))}
        </Table>
      )}
    </ConsoleFrame>
  );
}
