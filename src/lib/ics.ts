// M5-T0: reminder export. Builds RFC 5545 all-day VEVENTs straight from the
// ClockBoard's own clock2/clock4 deadline fields — never a separately
// maintained date, so this can't drift from what the clock board shows.
import type { ClockBoard, ISODate } from '@lapse/rules'
import { addDays } from '@lapse/rules'

type ReminderEvent = {
  uid: string
  date: ISODate
  summary: string
  description: string
}

function caseName(board: ClockBoard): string {
  return `Cheque #${board.facts.chequeNumber} — ${board.facts.drawerName}`
}

export function getReminderEvents(board: ClockBoard): ReminderEvent[] {
  const name = caseName(board)
  const events: ReminderEvent[] = []

  if (board.clock2 && board.clock2.status !== 'NEEDS_REVIEW') {
    events.push({
      uid: `${board.caseId}-notice@lapse.app`,
      date: board.clock2.noticeDeadline,
      summary: `${name} — send §138 demand notice`,
      description: 'Deadline to send the statutory demand notice under §138 proviso (b).',
    })
  }

  if (board.clock4) {
    events.push({
      uid: `${board.caseId}-filing@lapse.app`,
      date: board.clock4.filingDeadline,
      summary: `${name} — file §138 complaint`,
      description: 'Deadline to file the criminal complaint under §142(1)(b).',
    })
  }

  return events
}

function toICSDate(date: ISODate): string {
  return date.replaceAll('-', '')
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export function buildICS(board: ClockBoard): string {
  const events = getReminderEvents(board)
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const veventBlocks = events.map((event) =>
    [
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toICSDate(event.date)}`,
      `DTEND;VALUE=DATE:${toICSDate(addDays(event.date, 1))}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      'END:VEVENT',
    ].join('\r\n'),
  )

  return (
    ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lapse//Case Deadlines//EN', 'CALSCALE:GREGORIAN', ...veventBlocks, 'END:VCALENDAR'].join(
      '\r\n',
    ) + '\r\n'
  )
}

export function downloadICS(board: ClockBoard): void {
  const blob = new Blob([buildICS(board)], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reminders-${board.caseId}.ics`
  link.click()
  URL.revokeObjectURL(url)
}
