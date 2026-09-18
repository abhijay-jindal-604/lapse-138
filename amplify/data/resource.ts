import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
