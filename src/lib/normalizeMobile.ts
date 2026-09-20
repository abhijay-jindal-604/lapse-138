// Normalizes an Indian mobile number for equality comparison (BL-2 repeat-party
// matching): strips everything but digits, drops a leading country code (91) or
// trunk prefix (0), and keeps the last 10 digits. Returns null when there aren't
// at least 10 digits left — too short to be a real mobile number, so it can't
// match anything.
export function normalizeMobile(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  const last10 = digits.slice(-10)
  return last10
}
