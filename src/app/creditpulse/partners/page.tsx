"use client";
import { useApiCalls, usePartners, useSendTestWebhook } from "@/api/hooks";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { Btn, ErrorBox, Skel } from "@/components/ui";
import { PRODUCT_NAMES } from "@/lib/names";

/** SCR-67 partners, products and webhooks. Sandbox keys are masked; key rotation arrives with the production build. */
export default function Partners() {
  const { data, isLoading, isError, refetch } = usePartners();
  const calls = useApiCalls(undefined, 3000);
  const test = useSendTestWebhook();
  const hooks = (calls.data ?? []).filter((c) => c.method === "WEBHOOK");
  return (
    <ConsoleFrame scr="SCR-67" title="Đối tác, sản phẩm và webhook" subtitle="Ba đối tác sở hữu màn hình; HLB là bên cho vay (D-32).">
      {isError ? <ErrorBox onRetry={() => refetch()}>Không tải được danh sách đối tác.</ErrorBox> : isLoading ? <Skel className="h-40" /> : !data || data.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="empty">Chưa có đối tác.</p> : (
        <Table testId="partners" head={["Đối tác", "Sản phẩm", "Tài khoản thanh toán", "Khóa sandbox", ""]}>
          {data.map((p) => (
            <tr key={p.partnerId} data-testid="partner-row">
              <td className="px-3 py-2 font-semibold">{p.name}</td>
              <td className="px-3 py-2">{p.products.map((x) => PRODUCT_NAMES[x]).join(", ")}</td>
              <td className="px-3 py-2">{p.settlementAccountMask}</td>
              <td className="px-3 py-2">{p.sandboxKeyMask}</td>
              <td className="flex gap-2 px-3 py-2">
                <Btn variant="secondary" className="!w-auto px-3 py-1.5 text-xs" data-testid={`test-webhook-${p.partnerId}`} disabled={test.isPending} onClick={() => test.mutate(p.partnerId)}>Gửi webhook thử</Btn>
                <Btn variant="ghost" className="!w-auto px-3 py-1.5 text-xs" disabled title="Có trong bản sản xuất">Đổi khóa</Btn>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <section className="space-y-2">
        <h2 className="text-sm font-bold">Nhật ký webhook</h2>
        {hooks.length === 0 ? <p className="rounded-xl bg-card p-4 text-sm text-muted" data-testid="webhook-empty">Chưa có webhook nào. Gửi webhook thử hoặc chạy một kịch bản.</p> : (
          <Table testId="webhook-log" head={["Thời gian", "Sự kiện", "Trạng thái", "Độ trễ"]}>
            {hooks.slice(0, 20).map((h) => <tr key={h.callId} data-testid="webhook-row"><td className="px-3 py-2">{new Date(h.at).toLocaleTimeString("vi-VN")}</td><td className="px-3 py-2 font-semibold">{h.path}</td><td className="px-3 py-2">{h.status}</td><td className="px-3 py-2">{h.latencyMs} ms</td></tr>)}
          </Table>
        )}
      </section>
    </ConsoleFrame>
  );
}
