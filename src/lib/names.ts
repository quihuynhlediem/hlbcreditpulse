import { tKey } from "@/i18n";
export const PARTNER_NAMES: Record<string, string> = { "viettel-money": "Viettel Money", grab: "Grab", "so-ban-hang": tKey("Sổ Bán Hàng") };
export const PRODUCT_NAMES: Record<string, string> = { PAYMENT_INSTALLMENT: tKey("Trả góp thanh toán"), DRIVER_INSTANT_LOAN: tKey("Vay nhanh tài xế"), SELLER_FUNDING: tKey("Vốn kinh doanh") };
export const OUTCOME_NAMES: Record<string, string> = { APPROVED: tKey("Được duyệt"), COUNTER_OFFER: tKey("Duyệt số tiền thấp hơn"), DECLINED: tKey("Chưa được duyệt") };
export const APPEAL_NAMES: Record<string, string> = { NONE: "—", OPEN: tKey("Đang xem xét lại"), INFO_REQUESTED: tKey("Chờ khách bổ sung"), PENDING_SECOND_APPROVAL: tKey("Chờ người duyệt thứ hai"), UPHELD: tKey("Giữ nguyên"), OVERTURNED: tKey("Đã duyệt lại") };

