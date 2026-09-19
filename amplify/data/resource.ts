import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { draftNotice } from '../functions/draftNotice/resource';
import { extractFacts } from '../functions/extractFacts/resource';

// TASKS.md M0-T5 note: publicApiKey now, allow.owner() added in M5-T1 — keep both
// rules together at that point, don't replace this one, since re-authing every model
// later is expensive.
const schema = a.schema({
  Case: a
    .model({
      title: a.string().required(),
      // closed union, LEGAL_RULES.md §4
      status: a.enum([
        'NOT_A_138_CASE',
        'RESOLVED',
        'NEEDS_REVIEW',
        'DEADLINE_MISSED',
        'ACT_NOW',
        'ON_TRACK',
      ]),
      nextDeadlineDate: a.date(),
      daysToDeadline: a.integer(),
      isSample: a.boolean().default(false),
      facts: a.json(),
      result: a.json(),
      computedAt: a.date(),
      documentKey: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  // M4-T5: model-free synopsis path. Loads the saved case, recomputes nothing —
  // formats the already-tested computeSynopsis() output from the stored facts
  // and clock3 result. draftNotice's Bedrock-backed notice path (M4-T1) is a
  // separate, still-blocked query on the same function; this one never touches it.
  synopsisForCase: a
    .query()
    .arguments({ caseId: a.id().required() })
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(draftNotice)),

  // M4-T1: the Gemini-backed §138 demand notice path, same Lambda as
  // synopsisForCase (routed by event.info.fieldName in handler.ts) but its
  // own operation — it recomputes the clock board from the case's stored
  // `facts` via computeClockBoard on every call rather than trusting the
  // stored `result` snapshot (draft.ts), unlike synopsisForCase.
  draftNoticeForCase: a
    .query()
    .arguments({ caseId: a.id().required() })
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(draftNotice)),

  // M3-T1: Gemini-backed extraction from an already-uploaded document (S3 key
  // from M3-T3's Upload component). Returns ExtractedFacts (see
  // amplify/functions/extractFacts/types.ts) — only the eight document-
  // extractable CaseFacts fields, never the human-only or affidavit-boundary
  // ones (LEGAL_RULES.md §2, §7).
  extractFacts: a
    .query()
    .arguments({ documentKey: a.string().required() })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(extractFacts)),
}).authorization((allow) => [
  allow.resource(draftNotice).to(['query']),
  allow.resource(extractFacts).to(['query']),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
