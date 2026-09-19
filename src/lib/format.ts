// Shared display formatting for money and dates — UI-only, no rules-engine logic.
const RUPEES = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatRupees(amountInPaise: number): string {
  return `₹${RUPEES.format(Math.round(amountInPaise / 100))}`
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`
}
