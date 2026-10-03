"use client";
import { useState } from "react";
import { useCreateConsent } from "@/api/hooks";
import { track } from "@/api/track";
import type { PartnerId, SourceId } from "@/api/types";
import { Btn, Chip, ErrorBox, Lockup } from "@/components/ui";

interface ConsentCopy { title: string; read: string; purpose: string; retention: string }
const RETAIN = "12 tháng kể từ ngày bạn đồng ý, hoặc đến khi bạn rút lại.";
const WITHDRAW = "Bất cứ lúc nào tại Cài đặt > Quyền riêng tư và dữ liệu.";

/** Consent text is supplied by HLB (D-30). Only the partner's own data and HLB's own data are offered (R-22). */
export const CONSENT_COPY: Partial<Record<SourceId, (partner: string) => ConsentCopy>> = {
  "AD-01": (p) => ({ title: `Chia sẻ lịch sử giao dịch ví với Hong Leong Bank`, read: `Thời gian dùng ví, số tiền nạp/rút đều đặn, thanh toán hóa đơn. Chỉ dữ liệu từ ${p}; không đọc nội dung tin nhắn hay danh bạ.`, purpose: "Đánh giá khả năng trả nợ để tăng hạn mức trả góp của bạn.", retention: RETAIN }),
  "AD-05": (p) => ({ title: "Chia sẻ lịch sử thanh toán hóa đơn với Hong Leong Bank", read: `Hóa đơn điện, nước, internet đã trả qua ${p} và việc trả đúng hạn. Không đọc địa điểm của bạn.`, purpose: "Đánh giá khả năng trả nợ và tăng hạn mức.", retention: RETAIN }),
  "AD-04": (p) => ({ title: "Chia sẻ hành vi nạp tiền của ví với Hong Leong Bank", read: `Nhịp nạp tiền và thời gian sử dụng ví tại ${p}. Không dùng dữ liệu của tập đoàn mẹ.`, purpose: "Đánh giá mức ổn định.", retention: RETAIN }),
  "AD-03": () => ({ title: "Dùng lịch sử lương tại tài khoản HLB của bạn", read: "Khoản lương về đều hằng tháng, số tháng nhận lương, mức lương. Đây là dữ liệu của chính Hong Leong Bank.", purpose: "Tăng hạn mức và xét khả năng chi trả.", retention: RETAIN }),
  "B-02": () => ({ title: "Tra cứu hồ sơ tín dụng CIC", read: "Nghĩa vụ hiện có, số tổ chức cho vay, lịch sử nợ. Bắt buộc khi xét vay có trách nhiệm.", purpose: "Xét hạn mức và ngăn vay chồng chéo.", retention: RETAIN }),
  "AD-07": () => ({ title: "Chia sẻ thu nhập của bạn trên ứng dụng Grab với Hong Leong Bank", read: "Thu nhập mỗi kỳ, số ngày hoạt động, thời gian làm đối tác. Chỉ dữ liệu trên ứng dụng Grab; không dùng dữ liệu của GrabFin hay công ty liên kết.", purpose: "Xét hạn mức vay nhanh và mức khấu trừ theo thu nhập.", retention: RETAIN }),
  "AD-08": () => ({ title: "Chia sẻ doanh thu và thanh toán của cửa hàng với Hong Leong Bank", read: "Doanh số theo ngày, số đơn, tỷ lệ hoàn trả, tiền hàng về. Chỉ dữ liệu từ Sổ Bán Hàng; không đọc dữ liệu từ ngân hàng khác.", purpose: "Xét hạn mức vay vốn kinh doanh và mức trả theo doanh thu.", retention: RETAIN }),
};

export function ConsentSheet({ sourceId, customerRef, partnerId, partnerName, stepLabel, onGranted, onDeclined, declineHint }: { sourceId: SourceId; customerRef: string; partnerId: PartnerId; partnerName: string; stepLabel?: string; onGranted: () => void; onDeclined: () => void; declineHint?: string }) {
  const create = useCreateConsent();
  const [declined, setDeclined] = useState(false);
  const copy = (CONSENT_COPY[sourceId] ?? CONSENT_COPY["AD-01"]!)(partnerName);
  const rows: [string, string][] = [["Dữ liệu được đọc", copy.read], ["Mục đích", copy.purpose], ["Thời gian lưu", copy.retention], ["Rút lại", WITHDRAW]];
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="Đồng ý chia sẻ dữ liệu">
      <div className="max-h-full space-y-3 overflow-y-auto rounded-t-[20px] bg-card p-5 pb-6" data-testid="consent-sheet" data-source={sourceId}>
        {stepLabel && <Chip>{stepLabel}</Chip>}
        <h2 className="text-[17px] font-bold leading-snug text-ink">{copy.title}</h2>
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="text-xs font-semibold text-muted">{k}</div>
            <div className="text-[13px] text-ink">{v}</div>
          </div>
        ))}
        <Lockup />
        {create.isError && <ErrorBox>Chưa lưu được lựa chọn. Chưa có dữ liệu nào được chia sẻ.</ErrorBox>}
        {declined && declineHint && <p className="rounded-xl bg-primary-soft p-3 text-[13px] text-ink">{declineHint}</p>}
        <Btn
          disabled={create.isPending}
          onClick={async () => {
            try {
              await create.mutateAsync({ customerRef, partnerId, sourceId, purpose: copy.purpose, textVersion: "hlb-consent-v1", signature: "sig_demo", grantedAt: new Date().toISOString() });
              track("consent_granted", { sourceId });
              onGranted();
            } catch { /* surfaced via create.isError */ }
          }}
        >
          {create.isPending ? "Đang lưu…" : create.isError ? "Thử lại" : "Đồng ý kết nối"}
        </Btn>
        <Btn variant="secondary" onClick={() => { track("consent_declined", { sourceId }); if (declineHint && !declined) setDeclined(true); else onDeclined(); }}>
          {declined && declineHint ? "Vẫn không đồng ý" : "Không đồng ý"}
        </Btn>
      </div>
    </div>
  );
}
