"use client";
import { useState } from "react";
import { useApiCalls, usePartners, useRotateCredential, useSendTestWebhook } from "@/api/hooks";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { Btn, ErrorBox, Skel } from "@/components/ui";
import { PRODUCT_NAMES } from "@/lib/names";
import { useT, tKey } from "@/i18n";

/** SCR-67 partners, products and webhooks. Sandbox keys are masked; a rotated secret is shown once (AC-65.2). */
export default function Partners() {
  const t = useT();
  const rotate = useRotateCredential();
  const [secret, setSecret] = useState<{ partnerId: string; clientId: string; clientSecret: string; oldCredentialValidUntil?: string } | null>(null);
  const { data, isLoading, isError, refetch } = usePartners();
  const calls = useApiCalls(undefined, 3000);
  const test = useSendTestWebhook();
  const hooks = (calls.data ?? []).filter((c) => c.method === "WEBHOOK");
  return (
    <ConsoleFrame scr="SCR-67" title={tKey("Đối tác, sản phẩm và webhook")} subtitle={tKey("Ba đối tác sở hữu màn hình; HLB là bên cho vay (D-32).")}>
      {isError ? <ErrorBox onRetry={() => refetch()}>{t("Không tải được danh sách đối tác.")}</ErrorBox> : isLoading ? <Skel className="h-40" /> : !data || data.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="empty">{t("Chưa có đối tác.")}</p> : (
        <Table testId="partners" head={[tKey("Đối tác"), tKey("Sản phẩm"), tKey("Tài khoản thanh toán"), tKey("Khóa sandbox"), ""]}>
          {data.map((p) => (
            <tr key={p.partnerId} data-testid="partner-row">
              <td className="px-3 py-2 font-semibold">{p.name}</td>
              <td className="px-3 py-2">{p.products.map((x) => t(PRODUCT_NAMES[x])).join(", ")}</td>
              <td className="px-3 py-2">{p.settlementAccountMask}</td>
              <td className="px-3 py-2">{p.sandboxKeyMask}</td>
              <td className="flex gap-2 px-3 py-2">
                <Btn variant="secondary" className="!w-auto px-3 py-1.5 text-xs" data-testid={`test-webhook-${p.partnerId}`} disabled={test.isPending} onClick={() => test.mutate(p.partnerId)}>{t("Gửi webhook thử")}</Btn>
                <Btn variant="ghost" className="!w-auto px-3 py-1.5 text-xs" data-testid={`rotate-${p.partnerId}`} disabled={rotate.isPending} onClick={() => rotate.mutate(p.partnerId, { onSuccess: (r) => setSecret({ partnerId: p.partnerId, ...r }) })}>{t("Đổi khóa")}</Btn>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {secret && (
        <div role="status" className="space-y-1 rounded-xl border border-warning bg-card p-4 text-[13px]" data-testid="new-secret">
          <p className="font-semibold">{t("Khóa mới cho {0} — chỉ hiển thị một lần", secret.partnerId)}</p>
          <p className="font-mono text-xs">client_id: {secret.clientId}</p>
          <p className="font-mono text-xs">client_secret: {secret.clientSecret}</p>
          {secret.oldCredentialValidUntil && <p className="text-xs text-muted">{t("Khóa cũ còn dùng được đến {0}.", new Date(secret.oldCredentialValidUntil).toLocaleDateString())}</p>}
          <button className="text-xs font-semibold text-primary" onClick={() => setSecret(null)}>{t("Đã lưu khóa")}</button>
        </div>
      )}
      <section className="space-y-2">
        <h2 className="text-sm font-bold">{t("Nhật ký webhook")}</h2>
        {hooks.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="webhook-empty">{t("Chưa có webhook nào.")}</p> : (
          <Table testId="webhook-log" head={[tKey("Thời gian"), tKey("Sự kiện"), tKey("Trạng thái"), tKey("Độ trễ")]}>
            {hooks.slice(0, 20).map((h) => <tr key={h.callId} data-testid="webhook-row"><td className="px-3 py-2">{new Date(h.at).toLocaleTimeString(t("vi-VN"))}</td><td className="px-3 py-2 font-semibold">{h.path}</td><td className="px-3 py-2">{h.status}</td><td className="px-3 py-2">{h.latencyMs} ms</td></tr>)}
          </Table>
        )}
      </section>
    </ConsoleFrame>
  );
}
