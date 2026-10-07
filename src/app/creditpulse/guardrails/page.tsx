"use client";
import { useEffect, useState } from "react";
import { useAuditLog, usePolicy, useProposePolicy } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { ApprovalStep } from "@/components/console/ApprovalStep";
import { Btn, Card, ErrorBox, Skel } from "@/components/ui";
import { dmy, vnd } from "@/lib/format";
import { tr, useT, tKey } from "@/i18n";

/** SCR-66 guardrails and portfolio: DTI cap, stacking limit, CIC refresh, rung caps. Edits apply to the next decision and are logged. */
export default function Guardrails() {
  const t = useT();
  const { data: p, isLoading, isError, refetch } = usePolicy();
  const audit = useAuditLog();
  const update = useProposePolicy();
  const [pending, setPending] = useState<{ approvalId: string; kind: string; makerId: string } | null>(null);
  const [dti, setDti] = useState<number | null>(null);
  const [maxOpen, setMaxOpen] = useState<number | null>(null);
  const [cic, setCic] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (p && dti === null) { setDti(Math.round(p.dtiCap * 100)); setMaxOpen(p.maxOpenLoans); setCic(p.cicRefreshOnLimitChange); } }, [p, dti]); // eslint-disable-line react-hooks/set-state-in-effect
  const save = () => {
    if (!p) return;
    setMsg(null);
    update.mutate({ config: { dtiCap: (dti ?? 35) / 100, maxOpenLoans: maxOpen ?? 3, cicRefreshOnLimitChange: cic ?? true }, reason: tKey("Điều chỉnh rào chắn") }, {
      onSuccess: (a) => setPending(a as never),
      onError: (e: Error) => setMsg({ ok: false, text: e instanceof ApiError ? e.message : tKey("Không lưu được.") }),
    });
  };
  return (
    <ConsoleFrame scr="SCR-66" title={tKey("Hạn mức và rủi ro")} subtitle={tKey("Thay đổi tạo phiên bản chính sách mới và cần người duyệt khác; ghi nhật ký ai, khi nào.")}>
      {isError ? <ErrorBox onRetry={() => refetch()}>{t("Không tải được chính sách.")}</ErrorBox> : isLoading || !p || dti === null ? <Skel className="h-48" /> : (
        <>
          <Card className="space-y-3" data-testid="policy-form">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-[13px]"><span className="block text-xs text-muted">{t("Trần DTI (%)")}</span><input type="number" aria-label={t("Trần DTI")} value={dti} onChange={(e) => setDti(Number(e.target.value))} className="w-full rounded-lg border border-line px-2 py-1.5" /></label>
              <label className="space-y-1 text-[13px]"><span className="block text-xs text-muted">{t("Số khoản trả góp mở tối đa")}</span><input type="number" aria-label={t("Số khoản mở tối đa")} value={maxOpen ?? 3} onChange={(e) => setMaxOpen(Number(e.target.value))} className="w-full rounded-lg border border-line px-2 py-1.5" /></label>
              <label className="flex items-center gap-2 pt-5 text-[13px]"><input type="checkbox" checked={cic ?? true} onChange={(e) => setCic(e.target.checked)} />{t("Tra CIC khi hạn mức đổi")}</label>
            </div>
            <p className="text-xs text-muted">{t("Hạn mức theo bậc:")} {p.rungCaps.map((m) => vnd(m.amount)).join(" · ")}</p>
            <Btn className="!w-auto px-4 py-2 text-[13px]" onClick={save} disabled={update.isPending}>{t("Gửi duyệt chính sách")}</Btn>
            {pending && <ApprovalStep approval={pending} onApproved={() => { setPending(null); setMsg({ ok: true, text: tKey("Đã duyệt. Giá trị mới áp dụng cho quyết định tiếp theo.") }); }} />}
            {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-[13px] font-semibold text-success" : "text-[13px] font-semibold text-danger"} data-testid="policy-msg">{tr(msg.text)}</p>}
          </Card>
          <section className="space-y-2">
            <h2 className="text-sm font-bold">{t("Lịch sử thay đổi")}</h2>
            {!audit.data || audit.data.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="audit-empty">{t("Chưa có thay đổi nào.")}</p> : (
              <Table testId="audit" head={[tKey("Thời gian"), tKey("Người thực hiện"), tKey("Hành động"), tKey("Chi tiết")]}>
                {audit.data.map((a, i) => <tr key={i} data-testid="audit-row"><td className="px-3 py-2">{dmy(a.at)}</td><td className="px-3 py-2">{a.actor}</td><td className="px-3 py-2 font-semibold">{a.action}</td><td className="px-3 py-2 text-muted">{tr(a.detail)}</td></tr>)}
              </Table>
            )}
          </section>
        </>
      )}
    </ConsoleFrame>
  );
}
