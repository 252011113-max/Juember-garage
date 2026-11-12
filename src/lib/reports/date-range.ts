import { addDaysToDateKey, dateFromDateKey, getWorkshopDateKey } from "@/lib/queue/date";

export type ReportPeriod = "daily" | "weekly" | "monthly";

export function isReportPeriod(value: string): value is ReportPeriod {
  return value === "daily" || value === "weekly" || value === "monthly";
}

export function getReportDateRange(
  period: ReportPeriod,
  now = new Date(),
): { startKey: string; endKey: string; start: Date; end: Date } {
  const todayKey = getWorkshopDateKey(now);
  let startKey = todayKey;
  let endKey = addDaysToDateKey(todayKey, 1);

  if (period === "weekly") {
    const weekday = dateFromDateKey(todayKey).getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;
    startKey = addDaysToDateKey(todayKey, -daysSinceMonday);
    endKey = addDaysToDateKey(startKey, 7);
  } else if (period === "monthly") {
    startKey = `${todayKey.slice(0, 7)}-01`;
    const monthStart = dateFromDateKey(startKey);
    monthStart.setUTCMonth(monthStart.getUTCMonth() + 1);
    endKey = monthStart.toISOString().slice(0, 10);
  }

  return {
    startKey,
    endKey,
    start: dateFromDateKey(startKey),
    end: dateFromDateKey(endKey),
  };
}
