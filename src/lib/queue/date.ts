const workshopTimeZone = "Asia/Jakarta";

export function getWorkshopDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: workshopTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Unable to determine workshop date.");
  }
  return `${year}-${month}-${day}`;
}

export function dateFromDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = dateFromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dateFromDateKey(value).toISOString().slice(0, 10) === value;
}

export function isWithinWorkshopHours(
  date: Date,
  openTime: string,
  closeTime: string,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: workshopTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);
  const currentMinutes = hour * 60 + minute;
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  return (
    Number.isFinite(currentMinutes) &&
    Number.isFinite(openMinutes) &&
    Number.isFinite(closeMinutes) &&
    currentMinutes >= openMinutes &&
    currentMinutes < closeMinutes
  );
}

export function isAfterWorkshopClosingTime(
  date: Date,
  closeTime: string,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: workshopTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);
  const currentMinutes = hour * 60 + minute;
  const closeMinutes = closeHour * 60 + closeMinute;

  return (
    Number.isFinite(currentMinutes) &&
    Number.isFinite(closeMinutes) &&
    currentMinutes >= closeMinutes
  );
}
