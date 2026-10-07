"use client";
import { useConsentLedger, useTia } from "@/api/hooks";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { Card, Chip, ErrorBox, Skel } from "@/components/ui";
import { dmy } from "@/lib/format";
import { PARTNER_NAMES } from "@/lib/names";
import { tr, useT, tKey } from "@/i18n";

const TIA: Record<string, string> = { FILED: tKey("Đã nộp hồ sơ"), IN_PROGRESS: tKey("Đang chuẩn bị"), NOT_STARTED: tKey("Chưa bắt đầu") };

/** SCR-65 consent ledger and cross-border transfer impact assessment register. */
export default function Consent() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useConsentLedger();
  const tia = useTia();
  const csv = () => {
    const rows = [["receiptId", "customer", "partner", "source", "purpose", "status", "at"], ...(data ?? []).map((c) => [c.receiptId, c.customerMask, c.partnerId, c.sourceId, c.purpose, c.status, c.at])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${x}"`).join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "creditpulse-consent-ledger.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <ConsoleFrame scr="SCR-65" title={tKey("Đồng ý và TIA")} subtitle={tKey("Biên lai đồng ý của khách hàng theo từng nguồn dữ liệu, kèm tình trạng đánh giá tác động chuyển dữ liệu ra nước ngoài.")} actions={<button onClick={csv} className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] font-semibold">{t("Xuất CSV")}</button>}>
      <Card className="space-y-1" data-testid="tia">
        <h2 className="text-sm font-bold">{t("Đánh giá tác động chuyển dữ liệu (TIA)")}</h2>
        {tia.isLoading ? <Skel className="h-6" /> : <p className="text-[13px]">{tia.data ? t(TIA[tia.data.status]) : "—"}{tia.data?.filedAt ? ` · ${dmy(tia.data.filedAt)}` : ""}</p>}
      </Card>
      {isError ? <ErrorBox onRetry={() => refetch()}>{t("Không tải được sổ đồng ý.")}</ErrorBox> : isLoading ? <Skel className="h-40" /> : !data || data.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="empty">{t("Chưa có đồng ý nào.")}</p> : (
        <Table testId="ledger" head={[tKey("Thời gian"), tKey("Khách hàng"), tKey("Đối tác"), tKey("Nguồn"), tKey("Mục đích"), tKey("Trạng thái")]}>
          {data.map((c) => (
            <tr key={c.receiptId} data-testid="ledger-row" data-status={c.status}>
              <td className="px-3 py-2">{dmy(c.at)}</td><td className="px-3 py-2">{c.customerMask}</td><td className="px-3 py-2">{PARTNER_NAMES[c.partnerId]}</td><td className="px-3 py-2 font-semibold">{c.sourceId}</td><td className="px-3 py-2">{tr(c.purpose)}</td>
              <td className="px-3 py-2"><Chip tone={c.status === "GRANTED" ? "success" : "muted"}>{c.status === "GRANTED" ? t("Đã đồng ý") : t("Đã rút")}</Chip></td>
            </tr>
          ))}
        </Table>
      )}
    </ConsoleFrame>
  );
}
