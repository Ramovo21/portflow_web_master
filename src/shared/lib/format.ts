import dayjs, { type Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/vi";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export const BUSINESS_ZONE = "Asia/Ho_Chi_Minh";

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function todayIso(): string {
  return dayjs().tz(BUSINESS_ZONE).format("YYYY-MM-DD");
}

export function today(): Dayjs {
  return dayjs(todayIso());
}

export function currencySuffix(currency: string | null | undefined): string {
  return !currency || currency === "VND" ? "₫" : currency;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  return `${numberFormat.format(Number(amount))} ${currencySuffix(currency)}`;
}

export function formatMoneyShort(
  amount: number | string | null | undefined,
  currency?: string | null,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = Number(amount);
  const abs = Math.abs(value);
  const short = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
  if (abs >= 1e9) return `${short.format(value / 1e9)} tỷ ${currencySuffix(currency)}`;
  if (abs >= 1e6) return `${short.format(value / 1e6)} tr ${currencySuffix(currency)}`;
  return formatMoney(value, currency);
}

export function formatNumber(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === ""
    ? "—"
    : numberFormat.format(Number(value));
}

export function formatDate(value: string | null | undefined): string {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).tz(BUSINESS_ZONE).format("DD/MM/YYYY HH:mm") : "—";
}

export function formatRelative(value: string | null | undefined): string {
  return value ? dayjs(value).fromNow() : "—";
}

export function formatDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  return `${formatDate(from)} – ${to ? formatDate(to) : "không thời hạn"}`;
}

export function formatDueIn(
  dueAt: string,
  now: Dayjs = dayjs(),
): { text: string; overdue: boolean } {
  const minutes = dayjs(dueAt).diff(now, "minute");
  const overdue = minutes < 0;
  const abs = Math.abs(minutes);
  const days = Math.floor(abs / 1440);
  const hours = Math.floor((abs % 1440) / 60);
  const parts =
    days > 0
      ? `${days} ngày${hours ? ` ${hours} giờ` : ""}`
      : hours > 0
        ? `${hours} giờ`
        : `${abs % 60} phút`;
  return { text: overdue ? `quá hạn ${parts}` : `còn ${parts}`, overdue };
}

export function daysFromToday(date: string): number {
  return dayjs(date).diff(today(), "day");
}
