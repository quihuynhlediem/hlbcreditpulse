"use client";
import { useLearningLoop, usePolicy, useUpdatePolicy } from "@/api/hooks";
import { ConsoleFrame } from "@/components/console/ConsoleFrame";
import { Btn, Card, ErrorBox, KV, Skel } from "@/components/ui";

const pct = (n?: number, d = 1) => (n === undefined ? "—" : `${(n * 100).toFixed(d).replace(".", ",")}%`);

/** SCR-64 learning loop: randomised test band, champion vs challenger, wrongful-decline estimate. Illustrative values. */
export default function Learning() {
  const { data, isLoading, isError, refetch } = useLearningLoop();
  const policy = usePolicy();
  const update = useUpdatePolicy();
  const p = policy.data;
  const paused = data ? data.testBandShare === 0 : false;
  return (
    <ConsoleFrame scr="SCR-64" title="Học liên tục" subtitle="Duyệt ngẫu nhiên một phần nhỏ hồ sơ sát ngưỡng để học và sửa từ chối nhầm. Giá trị minh họa.">
      {isError ? <ErrorBox onRetry={() => refetch()}>Không tải được dữ liệu học liên tục.</ErrorBox> : isLoading || !data ? <Skel className="h-48" /> : paused ? (
        <Card className="space-y-2" data-testid="insufficient">
          <p className="text-sm">Chưa đủ dữ liệu để so sánh mô hình.</p>
          <Btn className="!w-auto px-4 py-2 text-[13px]" disabled={!p || update.isPending} onClick={() => p && update.mutate({ ...p, testBandShare: 0.03 })}>Bật lại vùng thử nghiệm 3%</Btn>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="learning">
          <Card className="grid gap-3 sm:grid-cols-3">
            <KV k="Vùng thử nghiệm ngẫu nhiên" v={pct(data.testBandShare, 0)} bold />
            <KV k="Từ chối nhầm ước tính" v={pct(data.wrongfulDeclineEstimate, 0)} bold />
            <KV k="Tài liệu mô hình" v={<a href={data.modelDocUrl ?? "#"} className="font-semibold text-primary underline">Xem tài liệu</a>} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["Mô hình đang chạy (champion)", data.champion, "champion"], ["Mô hình thử nghiệm (challenger)", data.challenger, "challenger"]] as const).map(([t, m, id]) => (
              <Card key={id} className="space-y-2" data-testid={id}>
                <h2 className="text-sm font-bold">{t} · {m.name}</h2>
                <KV k="Tỷ lệ duyệt" v={pct(m.approvalRate)} />
                <KV k="Tỷ lệ nợ xấu" v={pct(m.badRate)} />
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn data-testid="promote" className="!w-auto px-4 py-2 text-[13px]" disabled={!p || update.isPending} onClick={() => p && update.mutate({ ...p, championModel: data.challenger.name })}>Chuyển {data.challenger.name} lên đang chạy</Btn>
            <Btn data-testid="pause-band" variant="secondary" className="!w-auto px-4 py-2 text-[13px]" disabled={!p || update.isPending} onClick={() => p && update.mutate({ ...p, testBandShare: 0 })}>Tạm dừng vùng thử nghiệm</Btn>
          </div>
        </div>
      )}
    </ConsoleFrame>
  );
}
