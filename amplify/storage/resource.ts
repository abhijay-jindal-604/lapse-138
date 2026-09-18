import { defineStorage } from '@aws-amplify/backend';

// Guest access for now, matching Case's publicApiKey mode — no signed-in concept
// exists yet. Owner-prefixed paths land in M5-T1 alongside auth.
export const storage = defineStorage({
  name: 'lapseDocuments',
  access: (allow) => ({
    'documents/*': [allow.guest.to(['read', 'write', 'delete'])],
  }),
});
