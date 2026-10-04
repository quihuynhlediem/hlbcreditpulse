"use client";
import Link from "next/link";
import { useState } from "react";
import { useAppeals, useDecideAppeal } from "@/api/hooks";
import { ApiError } from "@/api/client";
import type { Appeal } from "@/api/types";
import { ApprovalStep } from "@/components/console/ApprovalStep";
import { ConsoleFrame } from "@/components/console/ConsoleFrame";
import { Btn, Card, Chip, ErrorBox, KV, Skel } from "@/components/ui";
import { tr, useT } from "@/i18n";
import { vnd } from "@/lib/format";
import { APPEAL_NAMES, OUTCOME_NAMES, PARTNER_NAMES } from "@/lib/names";

const REASONS = [["INCOME_VERIFIED", "Đã xác minh thu nhập"], ["NEW_EVIDENCE", "Khách cung cấp thêm bằng chứng"], ["SHARED_DEVICE_EXPLAINED", "Đã giải thích thiết bị dùng chung"], ["POLICY_CORRECT", "Quyết định của AI đúng chính sách"], ["RISK_TOO_HIGH", "Rủi ro vẫn cao"]] as const;
const AUTHORITY = 20_000_000;

function due(a: Appeal, now: number, t: (s: string, ...a: (string | number)[]) => string) {
  const hours = Math.round((new Date(a.dueAt).getTime() - now) / 3_600_000);
  if (a.status === "INFO_REQUESTED") return t("Tạm dừng: chờ khách bổ sung");
  return hours < 0 ? t("Quá hạn {0} giờ", -hours) : t("Còn {0} giờ", hours);
}

function AppealCard({ a, now }: { a: Appeal; now: number }) {
  const t = useT();
  const decide = useDecideAppeal();
  const [reason, setReason] = useState<string>(REASONS[0][0]);
  const [amount, setAmount] = useState<number>(a.requestedAmount?.amount ?? 0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<{ approvalId: string; kind: string; makerId: string } | null>(null);
  const closed = a.status === "UPHELD" || a.status === "OVERTURNED";
  const run = (outcome: "UPHELD" | "OVERTURNED") => {
    setErr(null);
    decide.mutate({ appealId: a.appealId, outcome, reasonCode: reason, amount: outcome === "OVERTURNED" ? amount : undefined }, {
      onSuccess: (r) => { const ap = (r as { approval?: { approvalId: string; kind: string; makerId: string } }).approval; if (ap) setPending(ap); },
      onError: (e) => setErr(e instanceof ApiError ? e.message : t("Không lưu được. Thử lại.")),
    });
  };
  return (
    <Card className={`space-y-2.5 ${a.slaState === "RED" && !closed ? "border border-danger" : a.slaState === "AMBER" && !closed ? "border border-warning" : ""}`} data-testid="appeal" data-sla={a.slaState} data-status={a.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/creditpulse/decisions/${a.decisionId}`} className="text-sm font-bold text-primary underline">{a.referenceNo} · {a.customerMask}</Link>
        {closed ? <Chip tone={a.status === "OVERTURNED" ? "success" : "muted"}>{t(APPEAL_NAMES[a.status])}</Chip>
          : <Chip tone={a.slaState === "RED" ? "warning" : a.slaState === "AMBER" ? "warning" : "muted"}>{a.slaState === "RED" ? t("Quá hạn 2 ngày làm việc") : due(a, now, t)}</Chip>}
      </div>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <KV k={t("Đối tác")} v={PARTNER_NAMES[a.partnerId ?? ""] ?? "—"} />
        <KV k={t("Quyết định của AI")} v={`${t(OUTCOME_NAMES[a.aiOutcome])}${a.aiAmount ? ` · ${vnd(a.aiAmount.amount)}` : ""}`} />
        <KV k={t("Số tiền khách đề nghị")} v={vnd(a.requestedAmount?.amount ?? 0)} />
        <KV k={t("Lý do của AI")} v={(a.reasonCodes ?? []).join(", ") || "—"} />
      </div>
      {a.note && <p className="rounded-lg bg-primary-soft p-2.5 text-[13px]"><span className="font-semibold">{t("Khách hàng viết:")} </span>{tr(a.note)}</p>}
      {closed ? (
        <p className="text-xs text-muted">{t("Đã xử lý bởi {0}", a.decidedBy ?? "—")}{a.newOffer ? ` · ${t("Ưu đãi mới {0}", vnd(a.newOffer.amount))}` : ""}</p>
      ) : a.status === "PENDING_SECOND_APPROVAL" && !pending ? (
        <p className="text-[13px] font-semibold text-warning">{t("Chờ người duyệt thứ hai (vượt thẩm quyền)")}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-[13px]"><span className="block text-xs text-muted">{t("Mã lý do")}</span>
            <select aria-label={t("Mã lý do")} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1.5">{REASONS.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>
          </label>
          <label className="space-y-1 text-[13px]"><span className="block text-xs text-muted">{t("Số tiền duyệt lại (₫)")}</span>
            <input type="number" aria-label={t("Số tiền duyệt lại")} value={amount} step={100_000} min={0} onChange={(e) => setAmount(Number(e.target.value))} className="w-36 rounded-lg border border-line px-2 py-1.5" />
          </label>
          <Btn data-testid="appeal-overturn" className="!w-auto px-4 py-2 text-[13px]" disabled={decide.isPending} onClick={() => run("OVERTURNED")}>{t("Duyệt lại")}</Btn>
          <Btn data-testid="appeal-uphold" variant="secondary" className="!w-auto px-4 py-2 text-[13px]" disabled={decide.isPending} onClick={() => run("UPHELD")}>{t("Giữ nguyên quyết định")}</Btn>
          {amount > AUTHORITY && <p className="w-full text-xs text-muted">{t("Trên {0} cần người duyệt thứ hai.", vnd(AUTHORITY))}</p>}
        </div>
      )}
      {err && <p role="alert" className="text-[13px] font-semibold text-danger">{tr(err)}</p>}
      {pending && <ApprovalStep approval={pending} onApproved={() => setPending(null)} />}
    </Card>
  );
}

/** SCR-63 appeals queue: human reassessment only when the customer asks (R-25, D-78). The AI decision is never edited. */
export default function Appeals() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useAppeals();
  const [now] = useState(() => Date.now());
  const open = data?.filter((a) => a.status !== "UPHELD" && a.status !== "OVERTURNED") ?? [];
  const done = data?.filter((a) => a.status === "UPHELD" || a.status === "OVERTURNED") ?? [];
  return (
    <ConsoleFrame scr="SCR-63" title="Hàng chờ xem xét lại" subtitle="AI quyết định mọi hồ sơ. Chuyên viên chỉ xem lại khi khách hàng yêu cầu, và trả lời trong 2 ngày làm việc.">
      {isError ? <ErrorBox onRetry={() => refetch()}>{t("Không tải được danh sách yêu cầu.")}</ErrorBox> : isLoading ? <Skel className="h-32" /> : (
        <div className="space-y-3">
          {open.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="empty">{t("Không có yêu cầu xem xét lại nào.")}</p> : open.map((a) => <AppealCard key={a.appealId} a={a} now={now} />)}
          {done.length > 0 && (
            <section className="space-y-2" data-testid="appeals-closed">
              <h2 className="text-sm font-bold">{t("Đã xử lý")} ({done.length})</h2>
              {done.map((a) => <AppealCard key={a.appealId} a={a} now={now} />)}
            </section>
          )}
        </div>
      )}
    </ConsoleFrame>
  );
}
