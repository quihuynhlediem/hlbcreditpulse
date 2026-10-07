"use client";
import { useState } from "react";
import { useConsents, useWithdrawConsent } from "@/api/hooks";
import { WalletFrame } from "@/components/kit/WalletFrame";
import { useWallet } from "@/lib/wallet";
import { Btn, Card, Chip, ErrorBox, Skel } from "@/components/ui";
import { SOURCE_BY_ID } from "@/mocks/fixtures";
import { useFlow } from "@/store/flow";
import { useT, tKey } from "@/i18n";

/** SCR-32 privacy and data settings: sources, receipts, withdraw. Withdrawal never changes an existing loan. */
export default function Privacy() {
  const w = useWallet();
  const B = w.base;
  const t = useT();
  const persona = useFlow((s) => s.persona);
  const { data, isLoading, isError, refetch } = useConsents(persona);
  const withdraw = useWithdrawConsent();
  const [msg, setMsg] = useState<string | null>(null);
  const active = data?.filter((c) => c.status === "GRANTED") ?? [];
  const history = data?.filter((c) => c.status === "WITHDRAWN") ?? [];
  return (
    <WalletFrame scr="SCR-32" title={tKey("Quyền riêng tư và dữ liệu")} back={`${B}`} nav="account">
      <div className="flex flex-col gap-3 p-4" data-testid="privacy">
        {msg && <div role="status" className="rounded-xl bg-success/10 p-3 text-[13px] font-semibold text-success">{t(msg)}</div>}
        {isError && <ErrorBox onRetry={() => refetch()}>{t("Chưa tắt được chia sẻ. Thử lại.")}</ErrorBox>}
        {isLoading && <Skel className="h-20" />}
        {!isLoading && data && active.length === 0 && <Card className="text-center text-sm">{t("Bạn chưa chia sẻ dữ liệu nào.")}</Card>}
        {active.map((c) => (
          <Card key={c.receiptId} className="space-y-2" data-testid="consent-row">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">{t(SOURCE_BY_ID[c.sourceId].name)}</h2><Chip tone="success">{t("Đang chia sẻ")}</Chip></div>
            <p className="text-[11px] text-muted">{t("Mã đồng ý: {0}…", c.receiptId.slice(0, 8))}</p>
            <Btn variant="secondary" disabled={withdraw.isPending} onClick={async () => { await withdraw.mutateAsync(c.receiptId); setMsg(tKey("Đã dừng chia sẻ. Dữ liệu sẽ không dùng cho lần xét sau.")); }}>{t("Rút lại")}</Btn>
          </Card>
        ))}
        {history.map((c) => <Card key={c.receiptId} tone="outline" className="flex items-center justify-between text-[13px]"><span>{t(SOURCE_BY_ID[c.sourceId].name)}</span><Chip tone="muted">{t("Đã rút lại")}</Chip></Card>)}
        <Card tone="soft" className="text-xs">{t("Rút lại không ảnh hưởng khoản vay hiện có. Dữ liệu sẽ không dùng cho lần xét sau.")}</Card>
        <Btn variant="secondary" onClick={() => { const blob = new Blob([JSON.stringify(data ?? [], null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "du-lieu-cua-toi.json"; a.click(); }}>{t("Tải dữ liệu của tôi")}</Btn>
      </div>
    </WalletFrame>
  );
}
