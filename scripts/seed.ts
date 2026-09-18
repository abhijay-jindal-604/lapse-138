// M4-T4: populate the dashboard with 12 sample cases covering every OverallStatus,
// including the hero case (LEGAL_RULES.md/DEMO.md's ₹3,20,000 Anand Traders v. Suresh
// Kumar deadline-missed file). Every case is computed through the real
// computeClockBoard() — never hand-authored ClockBoard JSON — so a sample case can never
// silently drift from what the engine itself would produce, and is written with
// isSample: true so the dashboard's "Sample data. Not real cases." banner (LEGAL_RULES.md
// §7) can key off it.
//
// Dates are all relative to today (todayInIST()), not hardcoded — D-09's "today is a
// parameter" applies here too, so the seed produces a correct, current-looking dashboard
// (hero case still overdue, ON_TRACK cases still days away) no matter when it's run, not
// just on the day it was written.

import { randomUUID } from 'node:crypto'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import {
  addDays,
  addMonths,
  computeClockBoard,
  todayInIST,
  toIntegerPaise,
  type CaseFacts,
} from '@lapse/rules'
import outputs from '../amplify_outputs.json'
import type { Schema } from '../amplify/data/resource'

Amplify.configure(outputs)
const client = generateClient<Schema>()

const today = todayInIST()
const back = (n: number) => addDays(today, -n)
const fwd = (n: number) => addDays(today, n)

function baseFacts(overrides: Partial<CaseFacts>): CaseFacts {
  return {
    payeeName: 'Anand Traders',
    payeeAddress: '14 MG Road, Pune 411001',
    drawerName: 'Suresh Kumar',
    drawerAddress: '22 Church Street, Pune 411002',
    chequeNumber: '000000',
    chequeDate: back(30),
    amountInPaise: toIntegerPaise(10000000),
    drawerBankName: 'Sunrise Cooperative Bank',
    drawerBankBranch: 'Church Street Branch',
    payeeBankBranch: 'MG Road Branch',
    presentationDate: back(25),
    dishonourMemoDate: null,
    bankInfoReceivedDate: null,
    dishonourReason: 'insufficient_funds',
    presentationCount: 1,
    noticeSentDate: null,
    noticeReceivedDate: null,
    noticeServiceMode: 'unknown',
    paymentStatus: 'none',
    paymentDate: null,
    complaintFiledDate: null,
    legallyEnforceableDebt: 'yes',
    interestClaimedInPaise: null,
    accusedEmail: null,
    accusedMobile: null,
    accusedMessagingDetails: null,
    ...overrides,
  }
}

// --- the 12 sample cases -----------------------------------------------------------

// Hero: the DEADLINE_MISSED case DEMO.md opens on — a trader delivered ₹3.2L of goods,
// took a cheque, it bounced, and the 30-day notice window closed 15 days ago. The
// cheque itself is still valid for 12 more days, so Clock 2's recovery path is
// RE_PRESENT_CHEQUE, not a dead end — this is deliberately the case that "doesn't stop
// there." Its notice deadline (15 days overdue) is the earliest date of any sample
// case, so it sorts to the top of the dashboard on its own — no special-casing needed.
const heroChequeDate = addMonths(fwd(12), -3)
const hero = baseFacts({
  chequeNumber: '004530',
  amountInPaise: toIntegerPaise(32000000), // ₹3,20,000
  chequeDate: heroChequeDate,
  presentationDate: addDays(heroChequeDate, 3),
  bankInfoReceivedDate: back(45), // notice deadline = back(15) — 15 days overdue
  dishonourMemoDate: back(47),
})

const onTrack1 = baseFacts({
  payeeName: 'Kavita Enterprises',
  payeeAddress: '9 FC Road, Pune 411004',
  drawerName: 'Rohit Malhotra',
  drawerAddress: '3 Koregaon Park, Pune 411001',
  chequeNumber: '221045',
  amountInPaise: toIntegerPaise(15000000), // ₹1,50,000
  chequeDate: back(20),
  presentationDate: back(15),
  dishonourMemoDate: back(6),
  bankInfoReceivedDate: back(5), // notice deadline = fwd(25) — well inside the window
})

const onTrack2 = baseFacts({
  payeeName: 'Om Sai Textiles',
  payeeAddress: '61 Laxmi Road, Pune 411030',
  drawerName: 'Deepak Verma',
  drawerAddress: '18 Aundh Road, Pune 411007',
  chequeNumber: '336610',
  amountInPaise: toIntegerPaise(8500000), // ₹85,000
  chequeDate: back(10),
  presentationDate: back(7),
  dishonourMemoDate: back(4),
  bankInfoReceivedDate: back(3), // notice deadline = fwd(27)
})

const actNow1 = baseFacts({
  payeeName: 'Green Valley Agro',
  payeeAddress: '5 Market Yard, Nashik 422001',
  drawerName: 'Manoj Yadav',
  drawerAddress: '27 College Road, Nashik 422005',
  chequeNumber: '447721',
  amountInPaise: toIntegerPaise(21000000), // ₹2,10,000
  chequeDate: back(40),
  presentationDate: back(35),
  dishonourMemoDate: back(30),
  bankInfoReceivedDate: back(28), // notice deadline = fwd(2) — urgent
})

// ACT_NOW via Clock 4 instead of Clock 2: notice already served, payment window already
// closed, and the one-month filing deadline is now the live clock, inside 7 days.
const actNow2ReceivedDate = back(40)
const actNow2 = baseFacts({
  payeeName: 'Bright Motors',
  payeeAddress: '44 Station Road, Pune 411001',
  drawerName: 'Sandeep Rana',
  drawerAddress: '12 Camp Area, Pune 411001',
  chequeNumber: '558833',
  amountInPaise: toIntegerPaise(47500000), // ₹4,75,000
  chequeDate: back(150),
  presentationDate: back(140),
  bankInfoReceivedDate: back(70),
  noticeSentDate: back(45),
  noticeReceivedDate: actNow2ReceivedDate,
  noticeServiceMode: 'received',
})

const resolved1 = baseFacts({
  payeeName: 'Reliable Traders',
  payeeAddress: '8 Shivaji Nagar, Pune 411005',
  drawerName: 'Anita Joshi',
  drawerAddress: '31 Kothrud, Pune 411038',
  chequeNumber: '662290',
  amountInPaise: toIntegerPaise(9500000), // ₹95,000
  chequeDate: back(90),
  presentationDate: back(85),
  bankInfoReceivedDate: back(50),
  noticeSentDate: back(25),
  noticeReceivedDate: back(20),
  noticeServiceMode: 'received',
  paymentStatus: 'full',
  paymentDate: back(15), // within the 15-day window ending back(5)
})

const resolved2 = baseFacts({
  payeeName: 'Coastal Hardware',
  payeeAddress: '2 Marine Drive, Mumbai 400002',
  drawerName: 'Vikram Nair',
  drawerAddress: '19 Andheri East, Mumbai 400069',
  chequeNumber: '773301',
  amountInPaise: toIntegerPaise(12000000), // ₹1,20,000
  chequeDate: back(100),
  presentationDate: back(95),
  bankInfoReceivedDate: back(60),
  noticeSentDate: back(35),
  noticeReceivedDate: back(30), // returned/refused date — deemed service
  noticeServiceMode: 'refused',
  paymentStatus: 'full',
  paymentDate: back(20), // within the 15-day window ending back(15)
})

const needsReviewPartPayment = baseFacts({
  payeeName: 'Metro Electricals',
  payeeAddress: '15 GT Road, Nagpur 440001',
  drawerName: 'Farhan Sheikh',
  drawerAddress: '6 Sitabuldi, Nagpur 440012',
  chequeNumber: '881122',
  amountInPaise: toIntegerPaise(6000000), // ₹60,000
  chequeDate: back(90),
  presentationDate: back(85),
  bankInfoReceivedDate: back(50),
  noticeSentDate: back(25),
  noticeReceivedDate: back(20),
  noticeServiceMode: 'received',
  paymentStatus: 'part',
  paymentDate: back(10),
})

const needsReviewSignature = baseFacts({
  payeeName: 'Sunrise Distributors',
  payeeAddress: '77 Ring Road, Nagpur 440010',
  drawerName: 'Neha Kapoor',
  drawerAddress: '4 Dharampeth, Nagpur 440010',
  chequeNumber: '990011',
  amountInPaise: toIntegerPaise(18000000), // ₹1,80,000
  chequeDate: back(20),
  presentationDate: back(15),
  bankInfoReceivedDate: back(10),
  dishonourReason: 'signature_mismatch',
})

const needsReviewAdvisory = baseFacts({
  payeeName: 'Vishal Enterprises',
  payeeAddress: '23 Sadar Bazaar, Delhi 110006',
  drawerName: 'Ritu Chawla',
  drawerAddress: '50 Karol Bagh, Delhi 110005',
  chequeNumber: '112233',
  amountInPaise: toIntegerPaise(24000000), // ₹2,40,000
  chequeDate: back(40),
  presentationDate: back(35),
  bankInfoReceivedDate: back(15),
  noticeSentDate: back(8), // sent, receipt not yet confirmed — advisory window
})

const notA138Debt = baseFacts({
  payeeName: 'Unity Traders',
  payeeAddress: '10 Sector 12, Chandigarh 160012',
  drawerName: 'Ajay Mehta',
  drawerAddress: '88 Sector 22, Chandigarh 160022',
  chequeNumber: '223344',
  amountInPaise: toIntegerPaise(7500000), // ₹75,000
  chequeDate: back(30),
  presentationDate: back(25),
  bankInfoReceivedDate: back(10),
  legallyEnforceableDebt: 'no',
})

const staleChequeDate = back(200)
const staleLastValid = addMonths(staleChequeDate, 3)
const notA138Stale = baseFacts({
  payeeName: 'Prime Logistics',
  payeeAddress: '99 NH-4, Bengaluru 560001',
  drawerName: 'Sunita Rao',
  drawerAddress: '5 Whitefield, Bengaluru 560066',
  chequeNumber: '334455',
  amountInPaise: toIntegerPaise(30000000), // ₹3,00,000
  chequeDate: staleChequeDate,
  presentationDate: addDays(staleLastValid, 10), // presented 10 days after it went stale
  bankInfoReceivedDate: addDays(staleLastValid, 13),
})

const samples: CaseFacts[] = [
  hero,
  onTrack1,
  onTrack2,
  actNow1,
  actNow2,
  resolved1,
  resolved2,
  needsReviewPartPayment,
  needsReviewSignature,
  needsReviewAdvisory,
  notA138Debt,
  notA138Stale,
]

function titleFor(facts: CaseFacts): string {
  return `Cheque #${facts.chequeNumber} — ${facts.drawerName}`
}

async function main() {
  // Idempotent: clear out any previously seeded sample cases first, so re-running
  // this script doesn't pile up duplicate rows on the dashboard.
  const { data: existing, errors: listErrors } = await client.models.Case.list({
    filter: { isSample: { eq: true } },
  })
  if (listErrors) {
    throw new Error(listErrors[0]?.message ?? 'Failed to list existing sample cases')
  }
  for (const c of existing) {
    await client.models.Case.delete({ id: c.id })
  }
  console.log(`Cleared ${existing.length} previously seeded sample case(s).`)

  const statusesSeen = new Set<string>()
  for (const facts of samples) {
    const caseId = randomUUID()
    const board = computeClockBoard(facts, today, caseId)
    statusesSeen.add(board.overallStatus)

    const { errors } = await client.models.Case.create({
      id: caseId,
      title: titleFor(facts),
      status: board.overallStatus,
      facts: JSON.stringify(board.facts),
      result: JSON.stringify(board),
      computedAt: board.computedAt,
      isSample: true,
    })
    if (errors) {
      throw new Error(errors[0]?.message ?? `Failed to create sample case ${caseId}`)
    }
    console.log(`Created ${titleFor(facts)} — ${board.overallStatus}`)
  }

  console.log(`\nSeeded ${samples.length} sample cases. Statuses covered: ${[...statusesSeen].sort().join(', ')}`)
  const allSix = ['ACT_NOW', 'DEADLINE_MISSED', 'NEEDS_REVIEW', 'NOT_A_138_CASE', 'ON_TRACK', 'RESOLVED']
  const missing = allSix.filter((s) => !statusesSeen.has(s))
  if (missing.length > 0) {
    throw new Error(`Missing statuses in seed data: ${missing.join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
