// Calendar arithmetic for the rules engine. Zero dependencies, no Date object
// except in todayInIST — see LEGAL_RULES.md §0 and §6.
//
// Dates are ISO calendar dates (YYYY-MM-DD), never a JS Date or a timestamp.
// All arithmetic below works in the proleptic Gregorian calendar via epoch-day
// conversion (Fliegel & Van Flandern), so it needs no timezone database and
// gives identical answers regardless of the host's local timezone.

export type ISODate = string // YYYY-MM-DD

function parseISODate(date: ISODate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

function toISODate(year: number, month: number, day: number): ISODate {
  const yyyy = String(year).padStart(4, '0')
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1]
}

// Days since the Unix epoch (1970-01-01 = 0), proleptic Gregorian calendar.
function toEpochDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  return jdn - 2440588
}

function fromEpochDay(epochDay: number): { year: number; month: number; day: number } {
  const jdn = epochDay + 2440588
  const a = jdn + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)
  const day = e - Math.floor((153 * m + 2) / 5) + 1
  const month = m + 3 - 12 * Math.floor(m / 10)
  const year = 100 * b + d - 4800 + Math.floor(m / 10)
  return { year, month, day }
}

/** date + days, where "days" excludes the trigger day itself (LEGAL_RULES.md §0). */
export function addDays(date: ISODate, days: number): ISODate {
  const { year, month, day } = parseISODate(date)
  const result = fromEpochDay(toEpochDay(year, month, day) + days)
  return toISODate(result.year, result.month, result.day)
}

/**
 * date + months, same day-of-month in the target month, clamped to the last
 * day of that month if it doesn't have that many days (LEGAL_RULES.md §0).
 */
export function addMonths(date: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(date)
  const totalMonths = year * 12 + (month - 1) + months
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = (((totalMonths % 12) + 12) % 12) + 1
  const clampedDay = Math.min(day, daysInMonth(newYear, newMonth))
  return toISODate(newYear, newMonth, clampedDay)
}

/** Number of days from `from` to `to`. Positive if `to` is later. */
export function diffDays(from: ISODate, to: ISODate): number {
  const f = parseISODate(from)
  const t = parseISODate(to)
  return toEpochDay(t.year, t.month, t.day) - toEpochDay(f.year, f.month, f.day)
}

/** -1 if a < b, 0 if equal, 1 if a > b. ISO date strings sort chronologically. */
export function compare(a: ISODate, b: ISODate): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/**
 * Today's calendar date in Asia/Kolkata. This is the one place in the whole
 * system that reads the clock or knows about a timezone (LEGAL_RULES.md §0, §6).
 */
export function todayInIST(): ISODate {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}
