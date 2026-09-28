// All of these treat date strings as plain YYYY-MM-DD values (no time, no
// timezone) — using noon UTC internally avoids the classic bug where a date
// silently shifts by a day depending on the user's local timezone.

export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Biweekly pay periods are fixed, non-shifting 14-day blocks — not just
// "the last two weeks from wherever you're looking." This anchor (a Monday)
// is an arbitrary but fixed reference point; every period is some whole
// number of 14-day blocks from it, so periods always land on the same
// boundaries no matter what date you start browsing from. Change this if it
// needs to line up with a specific real payroll calendar instead.
const PAY_PERIOD_ANCHOR = "2024-01-01";

export function payPeriodStart(dateStr: string): string {
  const monday = mondayOf(dateStr);
  const anchor = new Date(`${PAY_PERIOD_ANCHOR}T12:00:00Z`);
  const current = new Date(`${monday}T12:00:00Z`);
  const daysSinceAnchor = Math.round((current.getTime() - anchor.getTime()) / 86400000);
  const periodIndex = Math.floor(daysSinceAnchor / 14);
  return addDays(PAY_PERIOD_ANCHOR, periodIndex * 14);
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// With no timeZone, uses whatever machine runs this code — correct for a
// client component (the viewer's own browser) but not for a server
// component, which runs on the host's clock instead of the viewer's. Server
// callers should pass the viewer's zone (see getViewerTimeZone) when they
// have it.
export function todayISO(timeZone?: string): string {
  return new Date().toLocaleDateString("en-CA", timeZone ? { timeZone } : undefined); // YYYY-MM-DD
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// A single-letter weekday + numeric date ("M" / "8/24") — used wherever a
// full weekday name ("Mon, Aug 24") would be too wide, e.g. a 14-column
// pay-period calendar.
export function shortDayLabel(dateStr: string): { weekday: string; date: string } {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" }),
    date: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" }),
  };
}

// Months are represented as "YYYY-MM" strings throughout — matches the
// native <input type="month"> value format.

export function firstOfMonth(monthStr: string): string {
  return `${monthStr}-01`;
}

export function addMonths(monthStr: string, n: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function formatMonthLabel(monthStr: string): string {
  const d = new Date(`${monthStr}-01T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
