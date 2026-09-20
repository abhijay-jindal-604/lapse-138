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

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n]
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ')
}

function threeDigitWords(n: number): string {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? twoDigitWords(rest) : ''].filter(Boolean).join(' ')
}

// Cheque-style amount-in-words, Indian numbering (crore/lakh/thousand) — the
// line every cheque leads with, "Rupees ... Only". Rounds to the nearest
// rupee, same as formatRupees.
export function rupeesInWords(amountInPaise: number): string {
  let n = Math.round(amountInPaise / 100)
  if (n === 0) return 'Zero'
  const crore = Math.floor(n / 1e7)
  n %= 1e7
  const lakh = Math.floor(n / 1e5)
  n %= 1e5
  const thousand = Math.floor(n / 1e3)
  n %= 1e3
  const hundred = n

  return [
    crore ? `${threeDigitWords(crore)} Crore` : '',
    lakh ? `${twoDigitWords(lakh)} Lakh` : '',
    thousand ? `${twoDigitWords(thousand)} Thousand` : '',
    hundred ? threeDigitWords(hundred) : '',
  ]
    .filter(Boolean)
    .join(' ')
}
