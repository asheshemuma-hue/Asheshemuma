import { EventRecord, EventStatus } from '../data/demoData';

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

/**
 * Formats '2026-11-06' -> '6 Nov 2026'
 */
export function formatDayMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

/**
 * Formats '2026-11-15' -> '15 Nov'
 */
export function formatDayMonth(dateStr: string): string {
  if (!dateStr) return '—';
  const [, m, d] = dateStr.split('-').map(Number);
  if (!m || !d) return dateStr;
  return `${d} ${SHORT_MONTHS[m - 1]}`;
}

/**
 * Formats '2026-10-18' -> 'Oct 18'
 */
export function formatMonthDay(dateStr: string): string {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  if (!m || !d) return dateStr;
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

/**
 * Formats '09:00' -> '9:00 AM', '17:30' -> '5:30 PM'
 */
export function formatTime12h(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = mStr || '00';
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

/**
 * Formats start & end time into '9:00–11:00 AM' or '5:30–7:00 PM'
 * Matches the exact format in the Events screenshot.
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  if (!startTime) return '';
  if (!endTime) return formatTime12h(startTime);

  const [shStr, smStr] = startTime.split(':');
  const [ehStr, emStr] = endTime.split(':');
  const sh = Number(shStr);
  const eh = Number(ehStr);
  if (Number.isNaN(sh) || Number.isNaN(eh)) {
    return `${startTime}–${endTime}`;
  }

  const sPeriod = sh >= 12 ? 'PM' : 'AM';
  const ePeriod = eh >= 12 ? 'PM' : 'AM';
  const sh12 = sh % 12 === 0 ? 12 : sh % 12;
  const eh12 = eh % 12 === 0 ? 12 : eh % 12;

  if (sPeriod === ePeriod) {
    return `${sh12}:${smStr || '00'}–${eh12}:${emStr || '00'} ${ePeriod}`;
  }
  return `${sh12}:${smStr || '00'} ${sPeriod}–${eh12}:${emStr || '00'} ${ePeriod}`;
}

/**
 * Checks if dateStr falls in the same year and month as referenceDate (and on or before referenceDate)
 */
export function isJoinedInReferenceMonth(dateJoined: string, referenceDate: string): boolean {
  if (!dateJoined || !referenceDate) return false;
  const [jy, jm] = dateJoined.split('-').map(Number);
  const [ry, rm] = referenceDate.split('-').map(Number);
  return jy === ry && jm === rm && dateJoined <= referenceDate;
}

/**
 * Checks if dateStr is in the same year and month as referenceDate
 */
export function isSameMonthAndYear(dateStr: string, referenceDate: string): boolean {
  if (!dateStr || !referenceDate) return false;
  const [dy, dm] = dateStr.split('-').map(Number);
  const [ry, rm] = referenceDate.split('-').map(Number);
  return dy === ry && dm === rm;
}

/**
 * Returns Monday..Sunday date strings ('YYYY-MM-DD') for the week containing referenceDate
 */
export function getMondayToSundayWeekRange(referenceDate: string): { start: string; end: string } {
  const ref = parseLocalDate(referenceDate);
  // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayOfWeek = ref.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toISO = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    start: toISO(monday),
    end: toISO(sunday),
  };
}

/**
 * Computes effective event status based on referenceDate so changing demo date updates Upcoming/Completed automatically.
 */
export function getEffectiveEventStatus(event: EventRecord, referenceDate: string): EventStatus {
  if (event.status === 'Cancelled') return 'Cancelled';
  if (event.date < referenceDate) return 'Completed';
  if (event.date > referenceDate) return 'Upcoming';
  return event.status;
}

export function formatCurrencyUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
