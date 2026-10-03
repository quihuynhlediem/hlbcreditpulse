"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useDecision } from "@/api/hooks";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { Card, Chip, ErrorBox, KV, Skel } from "@/components/ui";
import { vnd } from "@/lib/format";
import { OUTCOME_NAMES } from "@/lib/names";

const STEP_STATUS: Record<string, string> = { QUERIED: "Đã truy vấn", SKIPPED: "Bỏ qua", UNAVAILABLE: "Không khả dụng" };
const COST_BUDGET = 30_000;

/** SCR-61 decision detail: waterfall, data used per source, ratings, reasons. PII is masked; no score is exposed to customers. */
export default function DecisionDetail() {
  const { decisionId } = useParams<{ decisionId: string }>();
  const { data: d, isLoading, isError, refetch } = useDecision(decisionId);
  const [copied, setCopied] = useState(false);
  const cost = (d?.waterfall ?? []).reduce((a, w) => a + (w.status === "QUERIED" ? w.costVnd ?? 0 : 0), 0);
  const copy = async () => { try { await navigator.clipboard.writeText(JSON.stringify(d, null, 2)); setCopied(true); } catch { setCopied(false); } };
  return (
    <ConsoleFrame scr="SCR-61" title="Chi tiết quyết định" subtitle={decisionId} actions={<>
      <Link href="/creditpulse/decisions" className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] font-semibold">Quay lại nhật ký</Link>
      <button onClick={copy} className="rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground">{copied ? "Đã chép" : "Chép vết API"}</button>
    </>}>
      {isError ? <ErrorBox onRetry={() => refetch()}>Không tải được chi tiết quyết định.</ErrorBox> : isLoading || !d ? <div className="space-y-2" aria-busy><Skel className="h-20" /><Skel className="h-40" /></div> : (
        <div className="space-y-4" data-testid="decision-detail">
          <Card className="grid gap-3 sm:grid-cols-4">
            <KV k="Kết quả" v={<Chip tone={d.outcome === "APPROVED" ? "success" : "warning"}>{OUTCOME_NAMES[d.outcome]}</Chip>} />
            <KV k="Tầng" v={d.tier} />
            <KV k="Độ trễ" v={`${d.latencyMs} ms`} />
            <KV k="Số tiền duyệt" v={d.approvedAmount ? vnd(d.approvedAmount.amount) : "—"} />
          </Card>
          <Card className="space-y-2">
            <h2 className="text-sm font-bold">Đầu ra xếp hạng</h2>
            <div className="grid gap-3 sm:grid-cols-4 text-[13px]" data-testid="ratings">
              <KV k="RG · Hạng rủi ro" v={d.ratings.riskGrade} />
              <KV k="AF · Khả năng chi trả" v={`${vnd(d.ratings.affordability?.amount ?? 0)}/tháng`} />
              <KV k="IN · Toàn vẹn" v={d.ratings.integrity === "PASS" ? "Đạt" : "Gắn cờ"} />
              <KV k="LM · Hạn mức" v={vnd(d.ratings.limit?.amount ?? 0)} />
            </div>
            {d.reasonCodes.includes("DEVICE_SHARED") && <p className="text-xs font-semibold text-warning" data-testid="device-flag">Thiết bị dùng chung (minh họa)</p>}
            <p className="text-[13px]" data-testid="reasons"><span className="font-semibold">Lý do: </span>{d.reasonCodes.join(", ") || "—"} · {d.explanationText}</p>
          </Card>
          <section className="space-y-2">
            <h2 className="text-sm font-bold">Thác nước dữ liệu</h2>
            <p className="text-[13px]" data-testid="cost-per-decision">Chi phí biến đổi mỗi quyết định (minh họa): <span className="font-semibold">{vnd(cost)}</span> {cost < COST_BUDGET ? <Chip tone="success">dưới ngưỡng {vnd(COST_BUDGET)}</Chip> : <Chip tone="warning">vượt ngưỡng {vnd(COST_BUDGET)}</Chip>}</p>
            {d.waterfall.length === 0 ? <p className="text-[13px] text-muted">Không có bước nào được ghi.</p> : (
              <Table testId="waterfall" head={["Thứ tự", "Nguồn", "Trạng thái", "Ghi chú"]}>
                {d.waterfall.map((w) => <tr key={w.order}><td className="px-3 py-2">{w.order}</td><td className="px-3 py-2 font-semibold">{w.sourceId}</td><td className="px-3 py-2">{STEP_STATUS[w.status] ?? w.status}</td><td className="px-3 py-2 text-muted">{w.stopReason ?? ""}{w.costVnd ? ` ${w.stopReason ? "· " : ""}${vnd(w.costVnd)}` : ""}</td></tr>)}
              </Table>
            )}
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-bold">Dữ liệu đã dùng</h2>
            <Table testId="sources" head={["Nguồn", "Biến đã đọc", "Đầu ra", "Trọng số", "Hạng", "Chi phí", "Độ trễ"]}>
              {d.dataUsed.map((s) => (
                <tr key={s.sourceId}>
                  <td className="px-3 py-2"><span className="font-semibold">{s.sourceId}</span> {s.name}</td>
                  <td className="px-3 py-2 text-muted">{(s.variablesRead ?? []).join(", ") || "—"}</td>
                  <td className="px-3 py-2">{s.outputs.join(" · ")}</td>
                  <td className="px-3 py-2">{s.weightScore.toFixed(2)}</td>
                  <td className="px-3 py-2">{s.rank > 0 ? `#${s.rank}` : "Nền tảng"}</td>
                  <td className="px-3 py-2">{vnd(s.costVnd ?? 0)}</td>
                  <td className="px-3 py-2">{s.latencyMs ?? 0} ms</td>
                </tr>
              ))}
            </Table>
          </section>
          <p className="text-xs text-muted">Biên lai đồng ý của khách hàng xem tại <Link href="/creditpulse/consent" className="font-semibold text-primary underline">Đồng ý và TIA</Link>.</p>
        </div>
      )}
    </ConsoleFrame>
  );
}
