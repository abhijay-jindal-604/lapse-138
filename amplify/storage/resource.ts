import { defineStorage } from '@aws-amplify/backend';

// Guest access for now, matching Case's publicApiKey mode — no signed-in concept
// exists yet. Owner-prefixed paths land in M5-T1 alongside auth.
//
// extractFacts (M3-T1) needs read access to this bucket too, but wiring that
// via `allow.resource()` here creates a circular dependency between the
// storage and data nested stacks (extractFacts lives in the data stack as a
// resolver). Granted instead in backend.ts with a plain CDK
// `bucket.grantRead()` after both stacks exist.
export const storage = defineStorage({
  name: 'lapseDocuments',
  access: (allow) => ({
    'documents/*': [allow.guest.to(['read', 'write', 'delete'])],
  }),
});
