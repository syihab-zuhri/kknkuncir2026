export const BUSINESS_TIME_ZONE = "Asia/Jakarta" as const;

const JAKARTA_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1000;
const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const clockPattern = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const businessClockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function getBusinessDate(epochMilliseconds = Date.now()): string {
  const parts = businessDateFormatter.formatToParts(
    new Date(epochMilliseconds),
  );
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function isIsoDate(value: string): boolean {
  const match = isoDatePattern.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const parsed = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return new Date(parsed).toISOString().startsWith(value);
}

export function normalizeBusinessClock(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export function isBusinessClock(value: string): boolean {
  const match = clockPattern.exec(value);
  if (!match) return false;

  const [, hours, minutes, seconds = "00"] = match;
  return Number(hours) <= 23 && Number(minutes) <= 59 && Number(seconds) <= 59;
}

export function businessDateTimeToEpoch(date: string, clock: string): number {
  if (!isIsoDate(date) || !isBusinessClock(clock)) {
    throw new Error("INVALID_BUSINESS_DATETIME");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes, seconds] = normalizeBusinessClock(clock)
    .split(":")
    .map(Number);

  return (
    Date.UTC(year, month - 1, day, hours, minutes, seconds) -
    JAKARTA_OFFSET_MILLISECONDS
  );
}

export function formatBusinessDate(date: string): string {
  const epoch = businessDateTimeToEpoch(date, "12:00:00");
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "long",
  }).format(new Date(epoch));
}

export function formatBusinessDateTime(epochMilliseconds: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(new Date(epochMilliseconds));
}

export function formatBusinessClock(epochMilliseconds: number): string {
  return businessClockFormatter.format(new Date(epochMilliseconds));
}
