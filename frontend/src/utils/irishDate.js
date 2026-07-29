const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const IRISH_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function validDateParts(year, month, day) {
  const date = new Date(year, month - 1, day, 12);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function dateToIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoDateToLocalDate(value) {
  const match = ISO_DATE_PATTERN.exec(value || "");
  if (!match) return undefined;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!validDateParts(year, month, day)) return undefined;
  return new Date(year, month - 1, day, 12);
}

export function formatIrishDate(value) {
  const match = ISO_DATE_PATTERN.exec(value || "");
  if (!match) return "";
  const [, year, month, day] = match;
  if (!validDateParts(Number(year), Number(month), Number(day))) return "";
  return `${day}/${month}/${year}`;
}

export function parseIrishDate(value) {
  const match = IRISH_DATE_PATTERN.exec((value || "").trim());
  if (!match) return "";
  const [, dayText, monthText, yearText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!validDateParts(year, month, day)) return "";
  return `${yearText}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getDublinTodayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isIsoDateOnOrAfter(value, minimum) {
  return Boolean(isoDateToLocalDate(value)) &&
    Boolean(isoDateToLocalDate(minimum)) &&
    value >= minimum;
}
