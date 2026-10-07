"use client";
import { useEffect, useRef, useState } from "react";
import { useCreateContract, useSignContract } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { track } from "@/api/track";
import type { Loan } from "@/api/types";
import { Btn, Card, Chip, ErrorBox, KV, Lockup, Skel } from "@/components/ui";
import { eirText, vnd } from "@/lib/format";
import { SOURCE_BY_ID } from "@/mocks/fixtures";
import { useDecision } from "@/api/hooks";
import { BottomBar } from "./PhoneShell";
import { useT, tKey } from "@/i18n";

/** Contract and e-sign (SCR-28, 45, 56): HLB contract key facts, consents recap, OTP. */
export function ContractView({ decisionId, packageId, borrowerNote, extraFacts = [], onSigned, onCancel }: { decisionId: string; packageId?: string; borrowerNote?: string; extraFacts?: [string, string][]; onSigned: (loan: Loan) => void; onCancel: () => void }) {
  const t = useT();
  const create = useCreateContract();
  const sign = useSignContract();
  const { data: d } = useDecision(decisionId);
  const started = useRef(false);
  const [otp, setOtp] = useState("");
  const [fails, setFails] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const contract = create.data;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    create.mutate({ decisionId, packageId: packageId ?? "pkg-6" });
  }, [create, decisionId, packageId]);

  const locked = fails >= 3;
  return (
    <>
      <div className="flex flex-1 flex-col gap-3 p-4" data-testid="contract">
        {create.isError && <ErrorBox onRetry={() => create.mutate({ decisionId, packageId: packageId ?? "pkg-6" })}>{t("Chưa tạo được hợp đồng. Đơn hàng được giữ.")}</ErrorBox>}
        {!contract && !create.isError && <Card className="space-y-2" role="status"><p className="text-sm font-semibold">{t("Đang tạo hợp đồng…")}</p><Skel /><Skel /><Skel /></Card>}
        {contract && (
          <>
            <Card className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">{t("Điều khoản chính")}</h2>
              <KV k={t("Bên cho vay")} v={contract.lender} />
              <KV k={t("Số tiền vay")} v={vnd(contract.amount.amount)} />
              <KV k={t("Kỳ hạn")} v={t("{0} tháng", contract.tenorMonths)} />
              <KV k={t("Tổng số tiền phải trả")} v={vnd(contract.totalPayable.amount)} bold />
              <KV k={t("Lãi suất hiệu dụng (EIR)")} v={contract.eir === 0 ? t("0% (người bán chịu)") : eirText(contract.eir)} bold />
              {extraFacts.map(([k, v]) => <KV key={k} k={t(k)} v={t(v)} />)}
              {borrowerNote && <KV k={t("Người vay")} v={t(borrowerNote)} />}
              <KV k={t("Phí ẩn")} v={t("Không có")} />
            </Card>
            {d && d.dataUsed.length > 0 && (
              <Card className="space-y-2">
                <div className="text-[13px] font-semibold">{t("Bạn đã đồng ý chia sẻ")}</div>
                <div className="flex flex-wrap gap-2">{d.dataUsed.map((s) => <Chip key={s.sourceId}>{t(SOURCE_BY_ID[s.sourceId].name)}</Chip>)}</div>
              </Card>
            )}
            <Card className="space-y-2">
              <label htmlFor="otp" className="text-[13px] font-semibold">{t("Nhập mã OTP gửi về 09•• ••• 567")}</label>
              <input id="otp" inputMode="numeric" maxLength={6} value={otp} disabled={locked} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-line px-3 py-3 text-center text-xl tracking-[0.5em]" autoComplete="one-time-code" />
              {err && <ErrorBox>{t(err)}</ErrorBox>}
              {expired && (
                <div role="alert" className="space-y-2 rounded-xl border border-warning bg-card p-3 text-[13px] text-ink" data-testid="session-expired">
                  <p>{t("Phiên đã hết hạn. Đơn hàng được giữ thêm 15 phút.")}</p>
                  <Btn variant="secondary" onClick={() => { setExpired(false); setErr(null); create.mutate({ decisionId, packageId: packageId ?? "pkg-6" }); }}>{t("Ký lại hợp đồng")}</Btn>
                </div>
              )}
              {locked && <p className="text-xs text-muted">{t("Gửi lại mã OTP sau 60 giây.")}</p>}
            </Card>
          </>
        )}
      </div>
      <BottomBar>
        <Lockup />
        <Btn
          disabled={!contract || otp.length < 6 || locked || expired || sign.isPending}
          onClick={async () => {
            if (!contract) return;
            try {
              const loan = await sign.mutateAsync({ contractId: contract.contractId, otp });
              track("contract_signed", { amount: contract.amount.amount });
              track("loan_booked", { loanId: loan.loanId });
              onSigned(loan);
            } catch (e) {
              if (e instanceof ApiError && e.type?.endsWith("session-expired")) { setExpired(true); setOtp(""); return; }
              const n = fails + 1;
              setFails(n);
              setOtp("");
              setErr(n >= 3 ? tKey("Mã OTP chưa đúng. Bạn đã hết lượt thử.") : tKey("Mã OTP chưa đúng. Vui lòng nhập lại."));
            }
          }}
        >
          {sign.isPending ? t("Đang xác nhận…") : t("Ký và xác nhận")}
        </Btn>
        <Btn variant="secondary" onClick={onCancel}>{t("Hủy")}</Btn>
      </BottomBar>
    </>
  );
}
