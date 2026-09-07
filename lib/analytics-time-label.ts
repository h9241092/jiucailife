const taiwanTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const explicitTimeZonePattern = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function taiwanTimeLabel(value: string) {
  const source = value.trim();
  const normalized = explicitTimeZonePattern.test(source)
    ? source
    : `${source.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return source.replace("T", " ").slice(0, 16) || "—";

  const parts = Object.fromEntries(
    taiwanTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}
