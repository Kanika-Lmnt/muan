// Vientiane time for anything that groups check-ins by month or by night.
//
// Check-ins are stored as UTC ISO strings, and the monthly streak, the
// monthly recap and "nights out" used to slice those strings directly —
// i.e. by the UTC calendar. Vientiane is UTC+7 (no daylight saving), so a
// check-in at 1 am on the 1st landed in the previous month, and a night out
// that crossed 7 am UTC... every boundary was seven hours off. These
// helpers do the grouping in local time instead.
export const VT_OFFSET_MS = 7 * 60 * 60 * 1000;

// a night out runs past midnight: anything before 6 am belongs to the
// night before
const NIGHT_ROLLOVER_MS = 6 * 60 * 60 * 1000;

// 'YYYY-MM' of an instant in Vientiane
export function vtMonth(date = new Date()) {
  return new Date(date.getTime() + VT_OFFSET_MS).toISOString().slice(0, 7);
}

// the month before 'YYYY-MM'
export function prevMonthOf(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

// [startIso, endIso) in UTC for a Vientiane month, for created_at range
// queries (created_at >= start AND created_at < end)
export function vtMonthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  return [
    new Date(Date.UTC(y, m - 1, 1) - VT_OFFSET_MS).toISOString(),
    new Date(Date.UTC(y, m, 1) - VT_OFFSET_MS).toISOString(),
  ];
}

// 'YYYY-MM-DD' of the night a check-in belongs to
export function vtNight(iso) {
  return new Date(new Date(iso).getTime() + VT_OFFSET_MS - NIGHT_ROLLOVER_MS).toISOString().slice(0, 10);
}
