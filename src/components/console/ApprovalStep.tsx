"use client";
import { useState } from "react";
import { useApproveChange, useSelfApprove } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { Btn, Card } from "@/components/ui";
import { tr, useT } from "@/i18n";

type Approval = { approvalId: string; kind: string; makerId: string };

/** Maker-checker step (US-60, DD-18): a change waits here until a different staff member approves it. */
export function ApprovalStep({ approval, onApproved }: { approval: Approval; onApproved: () => void }) {
  const t = useT();
  const approve = useApproveChange();
  const self = useSelfApprove();
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card className="space-y-2 border-warning" data-testid="approval-pending">
      <p className="text-[13px] font-semibold">{t("Đã gửi duyệt · người tạo: {0}", approval.makerId)}</p>
      <p className="text-xs text-muted">{t("Thay đổi chỉ có hiệu lực sau khi một người duyệt khác (Checker) chấp thuận. Mọi bước đều được ghi nhật ký kiểm toán.")}</p>
      <div className="flex flex-wrap gap-2">
        <Btn data-testid="approve-as-checker" className="!w-auto px-4 py-2 text-[13px]" disabled={approve.isPending}
          onClick={() => { setErr(null); approve.mutate(approval.approvalId, { onSuccess: onApproved, onError: (e) => setErr(e instanceof ApiError ? e.message : "Không duyệt được.") }); }}>
          {t("Duyệt với vai trò Checker")}
        </Btn>
        <Btn data-testid="approve-as-maker" variant="secondary" className="!w-auto px-4 py-2 text-[13px]" disabled={self.isPending}
          onClick={() => { setErr(null); self.mutate(approval.approvalId, { onError: (e) => setErr(e instanceof ApiError ? e.message : "Không duyệt được.") }); }}>
          {t("Tự duyệt (người tạo)")}
        </Btn>
      </div>
      {err && <p role="alert" className="text-[13px] font-semibold text-danger" data-testid="approval-error">{tr(err)}</p>}
    </Card>
  );
}
