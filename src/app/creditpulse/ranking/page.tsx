"use client";
import { useEffect, useState } from "react";
import { useRanking, useUpdateRanking } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { ConsoleFrame, Table } from "@/components/console/ConsoleFrame";
import { Btn, Card, ErrorBox, Skel } from "@/components/ui";
import { WEIGHTS } from "@/mocks/fixtures";

const KEYS = [["predictive", "Dự báo"], ["coverage", "Độ phủ"], ["cost", "Chi phí"], ["access", "Khả năng truy cập"], ["legal", "Pháp lý"]] as const;
type K = (typeof KEYS)[number][0];

/** SCR-62 alternative-data ranking (R-16, D-20): editable weights, scores, ranks, waterfall order, segment × rung matrix. */
export default function Ranking() {
  const { data, isLoading, isError, refetch } = useRanking();
  const save = useUpdateRanking();
  const [w, setW] = useState<Record<K, number> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data && !w) setW(Object.fromEntries(KEYS.map(([k]) => [k, Math.round(data.weights[k] * 100)])) as Record<K, number>); }, [data, w]); // eslint-disable-line react-hooks/set-state-in-effect
  const sum = w ? KEYS.reduce((a, [k]) => a + (w[k] || 0), 0) : 0;
  const submit = () => {
    if (!w) return;
    setErr(null); setSaved(false);
    save.mutate(Object.fromEntries(KEYS.map(([k]) => [k, (w[k] || 0) / 100])) as never, {
      onSuccess: () => setSaved(true),
      onError: (e) => setErr(e instanceof ApiError ? e.message : "Không lưu được. Thử lại."),
    });
  };
  const reset = () => setW(Object.fromEntries(KEYS.map(([k]) => [k, Math.round(WEIGHTS[k] * 100)])) as Record<K, number>);
  return (
    <ConsoleFrame scr="SCR-62" title="Xếp hạng dữ liệu thay thế" subtitle="Điểm = 30% dự báo + 25% độ phủ + 15% chi phí + 15% truy cập + 15% pháp lý (mặc định). Thay đổi được ghi nhật ký.">
      {isError ? <ErrorBox onRetry={() => refetch()}>Không tải được bảng xếp hạng.</ErrorBox> : isLoading || !data || !w ? <div className="space-y-2" aria-busy><Skel className="h-24" /><Skel className="h-64" /></div> : (
        <>
          <Card className="space-y-3" data-testid="weights">
            <div className="grid gap-3 sm:grid-cols-5">
              {KEYS.map(([k, l]) => (
                <label key={k} className="space-y-1 text-[13px]"><span className="block text-xs text-muted">{l} (%)</span>
                  <input type="number" min={0} max={100} aria-label={`Trọng số ${l}`} value={w[k]} onChange={(e) => { setW({ ...w, [k]: Number(e.target.value) }); setSaved(false); setErr(null); }} className="w-full rounded-lg border border-line px-2 py-1.5" />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={sum === 100 ? "text-[13px] font-semibold text-success" : "text-[13px] font-semibold text-danger"} data-testid="weight-sum">Tổng: {sum}%</span>
              <Btn className="!w-auto px-4 py-2 text-[13px]" onClick={submit} disabled={save.isPending}>Lưu trọng số</Btn>
              <Btn variant="secondary" className="!w-auto px-4 py-2 text-[13px]" onClick={reset}>Đặt lại mặc định</Btn>
            </div>
            {err && <p role="alert" className="text-[13px] font-semibold text-danger" data-testid="weights-error">{err}</p>}
            {saved && <p role="status" className="text-[13px] font-semibold text-success" data-testid="weights-saved">Đã lưu. Điểm và thứ hạng đã được tính lại.</p>}
          </Card>
          <Table testId="ranking-table" head={["Hạng", "Nguồn", "Điểm", "Dự báo", "Độ phủ", "Chi phí", "Truy cập", "Pháp lý"]}>
            {data.sources.map((s) => (
              <tr key={s.sourceId} data-testid="rank-row" data-source={s.sourceId}>
                <td className="px-3 py-2 font-bold">{s.rank}</td>
                <td className="px-3 py-2"><span className="font-semibold">{s.sourceId}</span> {s.name}</td>
                <td className="px-3 py-2 font-semibold">{s.score.toFixed(2).replace(".", ",")}</td>
                {(["predictive", "coverage", "cost", "access", "legal"] as const).map((k) => <td key={k} className="px-3 py-2">{s.ratings[k]}</td>)}
              </tr>
            ))}
          </Table>
          <Card className="space-y-1.5" data-testid="waterfall-order">
            <h2 className="text-sm font-bold">Thứ tự thác nước (rẻ và chắc trước)</h2>
            <p className="text-[13px]">{data.waterfallOrder.join(" → ")}</p>
          </Card>
          <section className="space-y-2">
            <h2 className="text-sm font-bold">Phân khúc × bậc thang</h2>
            <Table testId="segment-matrix" head={["Phân khúc", "Bậc 1", "Bậc 2", "Bậc 3", "Bậc 4", "Bậc 5"]}>
              {data.segmentRungMatrix.map((r) => <tr key={r.segment}><td className="px-3 py-2 font-semibold">{r.segment}</td>{[0, 1, 2, 3, 4].map((i) => <td key={i} className="px-3 py-2">{r.rungs?.[i]?.join(" + ") ?? "—"}</td>)}</tr>)}
            </Table>
          </section>
        </>
      )}
    </ConsoleFrame>
  );
}
