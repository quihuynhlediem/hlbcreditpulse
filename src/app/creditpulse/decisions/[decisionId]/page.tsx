"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useDecision } from "@/api/hooks";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { Card, Chip, ErrorBox, KV, Skel } from "@/components/ui";
import { dec, vnd } from "@/lib/format";
import { APPEAL_NAMES, OUTCOME_NAMES } from "@/lib/names";
import { tr, useT, tKey } from "@/i18n";

const STEP_STATUS: Record<string, string> = { QUERIED: tKey("Đã truy vấn"), SKIPPED: tKey("Bỏ qua"), UNAVAILABLE: tKey("Không khả dụng") };
const COST_BUDGET = 30_000;

/** SCR-61 decision detail: waterfall, data used per source, ratings, reasons. PII is masked; no score is exposed to customers. */
export default function DecisionDetail() {
  const t = useT();
  const { decisionId } = useParams<{ decisionId: string }>();
  const { data: d, isLoading, isError, refetch } = useDecision(decisionId);
  const [copied, setCopied] = useState(false);
  const cost = (d?.waterfall ?? []).reduce((a, w) => a + (w.status === "QUERIED" ? w.costVnd ?? 0 : 0), 0);
  const copy = async () => { try { await navigator.clipboard.writeText(JSON.stringify(d, null, 2)); setCopied(true); } catch { setCopied(false); } };
  return (
    <ConsoleFrame scr="SCR-61" title={tKey("Chi tiết quyết định")} subtitle={decisionId} actions={<>
      <Link href="/creditpulse/decisions" className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] font-semibold">{t("Quay lại nhật ký")}</Link>
      <button onClick={copy} className="rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground">{copied ? t("Đã chép") : t("Chép vết API")}</button>
    </>}>
      {isError ? <ErrorBox onRetry={() => refetch()}>{t("Không tải được chi tiết quyết định.")}</ErrorBox> : isLoading || !d ? <div className="space-y-2" aria-busy><Skel className="h-20" /><Skel className="h-40" /></div> : (
        <div className="space-y-4" data-testid="decision-detail">
          <Card className="grid gap-3 sm:grid-cols-4">
            <KV k={t("Kết quả")} v={<Chip tone={d.outcome === "APPROVED" ? "success" : d.outcome === "COUNTER_OFFER" ? "brand" : "warning"}>{t(OUTCOME_NAMES[d.outcome])}</Chip>} />
            <KV k={t("Xem xét lại")} v={d.appeal ? <Link href="/creditpulse/appeals" className="font-semibold text-primary underline">{t(APPEAL_NAMES[d.appeal.status])} · {d.appeal.referenceNo}</Link> : "—"} />
            <KV k={t("Độ trễ")} v={`${d.latencyMs} ms`} />
            <KV k={t("Số tiền duyệt")} v={d.approvedAmount ? `${vnd(d.approvedAmount.amount)}${d.requestedAmount && d.requestedAmount.amount !== d.approvedAmount.amount ? ` / ${vnd(d.requestedAmount.amount)}` : ""}` : "—"} />
          </Card>
          <Card className="space-y-2">
            <h2 className="text-sm font-bold">{t("Đầu ra xếp hạng")}</h2>
            <div className="grid gap-3 sm:grid-cols-4 text-[13px]" data-testid="ratings">
              <KV k={t("RG · Hạng rủi ro")} v={d.ratings.riskGrade} />
              <KV k={t("AF · Khả năng chi trả")} v={t("{0}/tháng", vnd(d.ratings.affordability?.amount ?? 0))} />
              <KV k={t("IN · Toàn vẹn")} v={d.ratings.integrity === "PASS" ? t("Đạt") : t("Gắn cờ")} />
              <KV k={t("LM · Hạn mức")} v={vnd(d.ratings.limit?.amount ?? 0)} />
            </div>
            {d.reasonCodes.includes("DEVICE_SHARED") && <p className="text-xs font-semibold text-warning" data-testid="device-flag">{t("Thiết bị dùng chung: số tiền được giới hạn tự động")}</p>}
            <p className="text-[13px]" data-testid="reasons"><span className="font-semibold">{t("Lý do:")} </span>{d.reasonCodes.join(", ") || "—"} · {tr(d.explanationText ?? "")}</p>
          </Card>
          <section className="space-y-2">
            <h2 className="text-sm font-bold">{t("Thác nước dữ liệu")}</h2>
            <p className="text-[13px]" data-testid="cost-per-decision">{t("Chi phí biến đổi của quyết định:")} <span className="font-semibold">{vnd(cost)}</span> {cost < COST_BUDGET ? <Chip tone="success">{t("dưới ngưỡng {0}", vnd(COST_BUDGET))}</Chip> : <Chip tone="warning">{t("vượt ngưỡng {0}", vnd(COST_BUDGET))}</Chip>}</p>
            {d.waterfall.length === 0 ? <p className="text-[13px] text-muted">{t("Không có bước nào được ghi.")}</p> : (
              <Table testId="waterfall" head={[tKey("Thứ tự"), tKey("Nguồn"), tKey("Trạng thái"), tKey("Ghi chú")]}>
                {d.waterfall.map((w) => <tr key={w.order}><td className="px-3 py-2">{w.order}</td><td className="px-3 py-2 font-semibold">{w.sourceId}</td><td className="px-3 py-2">{t(STEP_STATUS[w.status] ?? w.status)}</td><td className="px-3 py-2 text-muted">{tr(w.stopReason ?? "")}{w.costVnd ? ` ${w.stopReason ? "· " : ""}${vnd(w.costVnd)}` : ""}</td></tr>)}
              </Table>
            )}
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-bold">{t("Dữ liệu đã dùng")}</h2>
            <Table testId="sources" head={[tKey("Nguồn"), tKey("Biến đã đọc"), tKey("Đầu ra"), tKey("Trọng số"), tKey("Hạng"), tKey("Chi phí"), tKey("Độ trễ")]}>
              {d.dataUsed.map((s) => (
                <tr key={s.sourceId}>
                  <td className="px-3 py-2"><span className="font-semibold">{s.sourceId}</span> {tr(s.name)}</td>
                  <td className="px-3 py-2 text-muted">{(s.variablesRead ?? []).map((v) => tr(v)).join(", ") || "—"}</td>
                  <td className="px-3 py-2">{s.outputs.join(" · ")}</td>
                  <td className="px-3 py-2">{dec(s.weightScore)}</td>
                  <td className="px-3 py-2">{s.rank > 0 ? `#${s.rank}` : t("Nền tảng")}</td>
                  <td className="px-3 py-2">{vnd(s.costVnd ?? 0)}</td>
                  <td className="px-3 py-2">{s.latencyMs ?? 0} ms</td>
                </tr>
              ))}
            </Table>
          </section>
          <p className="text-xs text-muted">{t("Biên lai đồng ý của khách hàng xem tại")} <Link href="/creditpulse/consent" className="font-semibold text-primary underline">{t("Đồng ý và TIA")}</Link>.</p>
        </div>
      )}
    </ConsoleFrame>
  );
}
