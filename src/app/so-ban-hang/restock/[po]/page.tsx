"use client";
import { useParams, useRouter } from "next/navigation";
import { useCreatePrescreen } from "@/api/hooks";
import { SbhFrame } from "@/components/sbh/SbhFrame";
import { Btn, Card, Chip, KV } from "@/components/ui";
import { vnd } from "@/lib/format";
import { useFlow } from "@/store/flow";
import { useEffect } from "react";

const PO_TOTAL = 18_500_000;
const LINES = [["Mì gói thùng 30 gói", "40", 6_200_000], ["Dầu ăn 5L", "24", 5_100_000], ["Nước giải khát lốc 24", "30", 7_200_000]] as const;

/** SCR-52 restock order: "Trả góp tiền nhập hàng" appears on a purchase order above the threshold; funds go to the supplier (entry C3). */
export default function Restock() {
  const { po } = useParams<{ po: string }>();
  const router = useRouter();
  const { persona, set } = useFlow();
  const pre = useCreatePrescreen();
  const { mutate } = pre;
  useEffect(() => { mutate({ partnerId: "so-ban-hang", hashedCustomerId: `h_${persona}` }); }, [persona, mutate]);
  const eligible = pre.data?.eligible;
  return (
    <SbhFrame scr="SCR-52" title={`Đơn nhập hàng ${po}`} back="/so-ban-hang">
      <div className="flex flex-col gap-3 p-4">
        <Card className="space-y-1.5"><div className="text-xs text-muted">Nhà cung cấp</div><div className="text-sm font-semibold">Nhà phân phối Hoàng Gia</div></Card>
        <Card className="space-y-2">
          {LINES.map(([n, q, v]) => <div key={n} className="flex justify-between text-[13px]"><span>{n} <span className="text-muted">× {q}</span></span><span className="font-semibold">{vnd(v)}</span></div>)}
          <div className="border-t border-line pt-2"><KV k="Tổng tiền" v={vnd(PO_TOTAL)} bold /></div>
        </Card>
        {eligible && <Card tone="soft" className="space-y-1.5" data-testid="installment-chip"><Chip>Trả góp tiền nhập hàng</Chip><p className="text-xs text-ink">Tiền được chuyển thẳng cho nhà cung cấp. Bạn trả dần 10% mỗi kỳ tiền hàng về.</p></Card>}
        <div className="space-y-2">
          {eligible && <Btn data-testid="choose-installment" onClick={() => { set({ amount: PO_TOTAL }); router.push("/so-ban-hang/loan/offer"); }}>Trả góp tiền nhập hàng</Btn>}
          <Btn variant="secondary">Thanh toán toàn bộ</Btn>
        </div>
      </div>
    </SbhFrame>
  );
}
