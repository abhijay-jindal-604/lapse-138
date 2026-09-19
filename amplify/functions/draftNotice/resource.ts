import { defineFunction, secret } from '@aws-amplify/backend'

export const draftNotice = defineFunction({
  name: 'draft-notice',
  entry: './handler.ts',
  timeoutSeconds: 60, // M4-T1's Gemini drafting call can run well past the 3s default (mirrors extractFacts/resource.ts)
  environment: {
    GEMINI_API_KEY: secret('GEMINI_API_KEY'),
  },
})
