"use client";
import { useState } from "react";
import { useLearningLoop, usePolicy, useProposePolicy, useRequestModelMode } from "@/api/hooks";
import { ApprovalStep } from "@/components/console/ApprovalStep";
import { ConsoleFrame } from "@/components/console/ConsoleFrame";
import { Btn, Card, ErrorBox, KV, Skel } from "@/components/ui";
import { pct } from "@/lib/format";
import { useT, tKey } from "@/i18n";


/** SCR-64 learning loop: randomised test band, champion vs challenger, wrongful-decline estimate. Illustrative values. */
export default function Learning() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useLearningLoop();
  const policy = usePolicy();
  const update = useProposePolicy();
  const promote = useRequestModelMode();
  const [pending, setPending] = useState<{ approvalId: string; kind: string; makerId: string } | null>(null);
  const onPending = { onSuccess: (a: unknown) => setPending(a as never) };
  const p = policy.data;
  const paused = data ? data.testBandShare === 0 : false;
  return (
    <ConsoleFrame scr="SCR-64" title={tKey("Học liên tục")} subtitle={tKey("Duyệt ngẫu nhiên một phần nhỏ hồ sơ sát ngưỡng để học và sửa từ chối nhầm. Đổi mô hình hoặc vùng thử nghiệm cần người duyệt khác.")}>
      {isError ? <ErrorBox onRetry={() => refetch()}>{t("Không tải được dữ liệu học liên tục.")}</ErrorBox> : isLoading || !data ? <Skel className="h-48" /> : paused ? (
        <Card className="space-y-2" data-testid="insufficient">
          <p className="text-sm">{t("Chưa đủ dữ liệu để so sánh mô hình.")}</p>
          <Btn className="!w-auto px-4 py-2 text-[13px]" disabled={!p || update.isPending} onClick={() => p && update.mutate({ config: { testBandShare: 0.03 }, reason: tKey("Bật lại vùng thử nghiệm") }, onPending)}>{t("Bật lại vùng thử nghiệm 3%")}</Btn>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="learning">
          <Card className="grid gap-3 sm:grid-cols-3">
            <KV k={t("Vùng thử nghiệm ngẫu nhiên")} v={pct(data.testBandShare, 0)} bold />
            <KV k={t("Từ chối nhầm ước tính")} v={pct(data.wrongfulDeclineEstimate, 0)} bold />
            <KV k={t("Tài liệu mô hình")} v={<a href={data.modelDocUrl ?? "#"} className="font-semibold text-primary underline">{t("Xem tài liệu")}</a>} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {([[tKey("Mô hình đang chạy (champion)"), data.champion, "champion"], [tKey("Mô hình thử nghiệm (challenger)"), data.challenger, "challenger"]] as const).map(([title, m, id]) => (
              <Card key={id} className="space-y-2" data-testid={id}>
                <h2 className="text-sm font-bold">{t(title)} · {m.name}</h2>
                <KV k={t("Tỷ lệ duyệt")} v={pct(m.approvalRate)} />
                <KV k={t("Tỷ lệ nợ xấu")} v={pct(m.badRate)} />
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn data-testid="promote" className="!w-auto px-4 py-2 text-[13px]" disabled={!p || promote.isPending} onClick={() => promote.mutate({ modelVersionId: data.challenger.name ?? "v2", reason: tKey("Challenger tốt hơn trên vùng thử nghiệm") }, onPending)}>{t("Chuyển {0} lên đang chạy", data.challenger.name ?? "v2")}</Btn>
            <Btn data-testid="pause-band" variant="secondary" className="!w-auto px-4 py-2 text-[13px]" disabled={!p || update.isPending} onClick={() => p && update.mutate({ config: { testBandShare: 0 }, reason: tKey("Tạm dừng vùng thử nghiệm") }, onPending)}>{t("Tạm dừng vùng thử nghiệm")}</Btn>
          </div>
        </div>
      )}
      {pending && <div className="mt-3"><ApprovalStep approval={pending} onApproved={() => setPending(null)} /></div>}
    </ConsoleFrame>
  );
}
