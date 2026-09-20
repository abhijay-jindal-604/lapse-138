# DEMO.md — the 3-minute video

The judges see **this video and the README**. Nothing else. There is no live demo, no
chance to explain, no follow-up question. Everything that matters has to be on screen.

**Length:** 2:50 target, 3:00 absolute ceiling.
**Record:** Sunday 12:00–15:00 IST. Budget three takes.
**Setup:** 1080p, browser at 100% zoom, bookmarks bar hidden, notifications off, one clean
profile, demo account already signed in. Record screen and audio separately if the mic is
poor — a clean voiceover over clean screen capture beats a single nervous take.

---

## Before you hit record — the pregeneration pass (do this first, not on camera)

Do this once, quietly, with no camera running, before any take:

1. Open the live URL: https://main.ddkpu3vpsh6s9.amplifyapp.com
2. Upload `samples/demo-case/dishonour-memo.pdf` and let extraction run for real.
3. Correct `bankInfoReceivedDate` to `2026-08-06`.
4. Generate the synopsis and save the case. **Do not click "generate draft notice" on this
   case** — its Clock 2 is `DEADLINE_MISSED`, and `assertNoticeEligible()`
   (`amplify/functions/draftNotice/notice.ts`) deliberately throws on that status rather
   than draft a notice for a window that's already closed. The notice-generation shot
   (step 8 below) uses a second, still-open case instead — see that step for which one.
5. Confirm the dashboard has at least one seeded case whose notice window is still open
   (e.g. the `actNow1` / "Green Valley Agro" case from `scripts/seed.ts`, Clock 2 status
   `live`). If the seed data isn't on the live deployment yet, run the existing seed
   script against it now — this is populating data with an already-built script, not new
   feature work, so it's fine under the M6 freeze. Generate that case's draft notice now,
   for real, and save it too.

This is the one live Gemini call each of these two cases should ever need. It leaves
behind two saved cases — the hero (extracted fields, corrected date, generated synopsis)
and the second, open one (generated notice) — that the recording below opens/cuts to
instead of calling the model again. **Nothing in the actual recording may depend on a live
model call** (see "Rules for the recording" below) — that protection only works if this
pass has already happened and produced saved cases to fall back on. If this hasn't been
done yet, do it before reading any further.

---

## The script

### 0:00–0:20 · Hook — the hero case, and it's already late
> *Screen: the case detail view for the real (redacted) demo case, not the dashboard.*

"This is a case a legal-aid clinic sees every week. A trader delivered three lakh twenty
thousand rupees of goods, took a cheque, and the cheque bounced.

Under Section 138, he had thirty days from the day the bank told him to send a legal notice.
He's on day forty-five. The window's closed.

Most calculators would stop there. This one doesn't."

*The overall status — `DEADLINE_MISSED`, large and unmistakable — must be on screen
immediately. This is deliberate: our stated core user is already late, so the demo does not
open on a clean, on-time case.*

### 0:20–0:45 · The problem, with numbers we can defend
> *Screen: the clock board.*

"The Supreme Court has intervened in Section 138 pendency three times in five years, and
since the first of November this year, every complaint filed in the country has to include a
mandated synopsis in a prescribed format. Forty-three lakh cheque-bounce cases are pending
nationwide. In Delhi's district courts alone, a separate filing counted six and a half lakh.

The deadlines that decide them are simple arithmetic — thirty days, fifteen days, one month.
But the realistic user of this tool isn't someone who stumbles onto a website in their own
thirty-day window — it's the clinic, the accountant, the recovery team, handling many of
these at once, with no time to do the arithmetic by hand for each one, and often finding the
file after a deadline has already passed.

Lapse does the arithmetic, and it doesn't stop at 'you're late.'"

### 0:45–2:05 · The walkthrough — mostly one unbroken take, on the blown deadline
> *Screen: the real app. One deliberate cut, at step 8, to a second saved case — everything
> else stays on the hero case.*

1. **Upload** the redacted sample dishonour memo. *"We start with the one document everyone
   has — the bank's return memo."*
2. **Extraction lands.** *"Gemini reads it. Cheque number, date, amount, reason for
   dishonour — and for every single field, the exact line it came from."* **Hover one field
   to show its source quote.**
3. **Correct a field.** *"It got the date he actually found out about the bounce wrong —
   that's a field a document can't answer, so we ask."* **Change it and watch the board
   recompute.**
4. **The clock board, and the deadline that's already gone.** *"Four clocks: present the
   cheque, send the notice, wait fifteen days, file within one month. The notice clock closed
   fifteen days ago."* **Show `DEADLINE_MISSED` on Clock 2, in full visual weight, not
   greyed out.**
5. **Expand the reasoning.** *"Every date shows its section, its trigger date, and the
   counting rule. Section nine of the General Clauses Act says you exclude the day you were
   told."*
6. **The cheque-validity check that decides everything next.** *"Before this app tells you
   what to do, it checks one more date: is the cheque itself still valid? Three months from
   the date on it. Here, yes — twelve days left."* **Show the presentation-validity check
   explicitly gating the next step.**
7. **The salvage path.** *"Because the cheque is still valid, it can be re-presented — and
   that's not a patch on the old clock, it's a fresh dishonour that restarts the whole chain:
   a new thirty-day notice window, a new fifteen-day wait, a new filing window. If the cheque
   had also expired, this app would say so and point to a civil suit instead — it never shows
   a salvage path that's actually closed."* **Show the `recoveryPath` panel with the same
   visual weight as the missed deadline, and the earliest-permissible re-filing date next to
   the new deadline — not filing too early is as fatal as filing too late.**
8. **Cut to a second, still-open case, and open its already-generated draft notice.**
   *"That recovery path becomes real the moment the cheque is re-presented and bounces
   again — a fresh case, with its own fresh thirty-day window. Here's what the notice
   looks like once that window is open: drafted around dates the model never calculated,
   and it reminds him to send it by registered post and keep the tracking receipt, because
   that receipt is the evidence of service the case will need."* **Show the DRAFT header
   and the registered-post reminder line.**
9. **Cut back to the hero case. Generate its synopsis — no AI call.** *"Back to the blown
   deadline. This — the Supreme Court now requires every Section 138 complaint to carry a
   structured synopsis, in this exact format, since the first of November. We already have
   every field it needs, confirmed by a human. One click, zero model calls — it's pure
   formatting of data you already checked."*
10. **Edit a line, download it.**
11. **Date-travel — the wow moment.** *"One more thing. Everything you just saw came from one
    pure function of the facts and today's date. Watch what happens when I drag today."*
    **Drag the date slider live, in one continuous motion, from before the dishonour through
    the healthy window, into `ACT_NOW`, past the notice deadline into `DEADLINE_MISSED`, and
    watch the recovery path appear.** *"No page reload, no server round trip, no model call —
    just the same engine, a hundred and eleven tests deep, recomputing in real time. That's
    what 'the model never decides' actually looks like."*

### 2:05–2:22 · Where AWS fits, and the boundary
> *Screen: the architecture diagram from the README.*

"React on Amplify Hosting. AppSync and DynamoDB for data. S3 for documents. Two Lambdas
that call the Gemini API — one reads the document, the other writes the draft. The
synopsis needs no model call at all — it's just the confirmed data, reformatted.

And in the middle, doing the one thing that actually decides someone's case: a pure
TypeScript function with no network access and no model, tested against twenty-seven cases
drawn from the bare text of the Act and five Supreme Court judgments: *Econ Antri* on
counting, *MSR Leathers* on re-presentation, *Yogendra Pratap Singh* on premature filing,
*C.C. Alavi Haji* on deemed service, and *Sanjabij Tari* on the synopsis.

**The model reads and the model writes. The model never decides — and that includes the
affidavit.** Every field that flows into a sworn statement in this app is entered by a human
and carried through unchanged; the app never infers it and never drafts the affidavit itself.
Every deadline in this app comes from code we can show you and tests we can run in front of
you."

### 2:22–2:42 · What we learned
> *Screen: faces, or the LEARNINGS.md file.*

"Two honest things.

First: we started this weekend building something else — a tool to find undertrial
prisoners eligible for release under Section 479 of the BNSS. We read the statute properly
on day one and killed it. Sub-section two bars release if more than one case is pending, and
filing multiple sections in one FIR is routine — the government's own campaign found nine
hundred fifty-one eligible people nationwide, against roughly four lakh undertrials. We'd
rather ship something where the law actually works, and where we can prove it with tests.

Second: our first draft of this pitch had the wrong number — three point three crore pending
cases, when the real figure for Section 138 specifically is forty-three lakh. Then a second
review caught something subtler: we'd been citing 'thirty percent of all pending criminal
cases' as a Supreme Court committee finding. It's real, but it's an oral observation from a
2021 hearing, reported in the press — the Court's own written judgment four weeks later put
Section 138 cases at one and a half percent of pendency, using a different, narrower base. We
now attribute the thirty percent precisely, to the bench and the hearing it came from, and we
don't lead with it — the institutional story, three interventions in five years and a
mandatory national filing format, doesn't need a contested number to make the point. We're
saying this on camera because a legal tool that gets a public number wrong in its own pitch
doesn't deserve to be trusted with anyone's dates."

### 2:42–2:50 · Roadmap and close
> *Screen: the case detail view, salvage path visible.*

"The engine is built as rule packs. Section 138 is the first. Consumer limitation periods,
RTI appeal windows and labour claims are the same shape — a trigger date, a counting rule,
and a right that disappears in silence.

He missed one deadline. He still has a path. Now somebody's counting it for him."

---

## Mapping to the five judging criteria

| Criterion | Where it lands | Seconds |
|---|---|---|
| **Idea and impact** | Hook + problem: a concrete case already past its deadline, sourced numbers (43 lakh cases nationwide, precisely-attributed 30% observation) | 0:00–0:45 |
| **Built on AWS** | Named services over the architecture diagram, with the reason for each | 2:05–2:22 |
| **Learning** | The §479 pivot and owning the pendency-number correction — both specific, both honest | 2:22–2:42 |
| **Execution** | The walkthrough on the live URL: extraction, salvage path, notice (on a second open case), synopsis, live date-travel | 0:45–2:05 |
| **The video itself** | Under 3:00, clear audio, no dead air, one idea per shot | all |

---

## Shot list — every one of these must actually work on camera

| # | Shot | Must show | Fallback if broken |
|---|---|---|---|
| 1 | Case detail view, the real redacted demo case | `DEADLINE_MISSED` status, unmistakable, on day 45 | Pre-loaded; never depends on a live call during recording |
| 2 | Upload the redacted sample memo | The file landing, a progress state | Pre-uploaded case, open it instead |
| 3 | Extraction result | Fields populated, one source quote on hover | **Pre-extracted and saved.** Do not gamble on a live Gemini call during recording. |
| 4 | Correcting a field | The board visibly recomputing | — |
| 5 | Clock board, all four clocks | Four distinct clocks with day counts, Clock 2 shown as missed | — |
| 6 | Reasoning chain expanded | Section reference, trigger date, counting rule, result date | — |
| 7 | Cheque-validity check | The presentation-validity date (3 months from cheque date) shown explicitly gating the recovery path | — |
| 8 | Recovery path on the `DEADLINE_MISSED` case | The re-presentation salvage path **and** the earliest-permissible re-filing date, rendered with full visual weight, not greyed out | Cut to a saved case that already shows it |
| 9 | Draft notice generated, **on the second, still-open case, not the hero** | Readable legal notice with the DRAFT header and the registered-post reminder | Pre-generated draft saved on that second case. Never attempt this on the `DEADLINE_MISSED` hero case — `assertNoticeEligible()` throws on it by design. |
| 10 | Synopsis generated, **back on the hero case** | All synopsis sections populated including the affidavit-flagged contact-particulars section, "DRAFT SYNOPSIS" header | Pre-generated synopsis saved on the hero case |
| 11 | Editing and downloading the notice and the synopsis (two different saved cases) | The downloaded files opening | — |
| 12 | **Date-travel slider, dragged live** | The case crossing `ON_TRACK` → `ACT_NOW` → `DEADLINE_MISSED` with the recovery path appearing, all in one continuous drag, no reload | **This is the designated wow moment (D-21). Do not cut this shot under any time pressure** — it is the single most differentiating five seconds in the video. |
| 13 | Architecture diagram | Every AWS service named in the script | Static image in the README |
| 14 | Test suite running green | `npm test` output — 111 passing in the rules engine plus 33 in the AWS layer, 144 total, in a terminal | **Do not skip this shot.** It is the proof behind the whole "the model never decides" claim, and it takes four seconds. |

---

## Rules for the recording

- **Nothing in the video may depend on a live Gemini call.** Pre-extract and pre-generate.
  A cold Lambda or a throttle during take three will cost an hour you do not have.
- Say the number of tests out loud. "144" is concrete; "well tested" is noise.
- Never say "potentially", "might", "we hope to". Present tense, what it does.
- Do not apologise for anything that is missing. Put it in the roadmap line instead.
- Watch the whole thing once at full length before uploading. Check the audio at both ends.
- Upload by 18:00 IST and open the link in a private window before submitting.
