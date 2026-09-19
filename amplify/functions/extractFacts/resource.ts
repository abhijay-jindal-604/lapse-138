import { defineFunction, secret } from '@aws-amplify/backend'

export const extractFacts = defineFunction({
  name: 'extract-facts',
  entry: './handler.ts',
  timeoutSeconds: 60, // Gemini's multimodal call can run well past the 3s default
  environment: {
    GEMINI_API_KEY: secret('GEMINI_API_KEY'),
  },
  // Used as a data resolver (extractFacts query) and granted storage access —
  // without this, the storage/data/function nested stacks form a circular
  // dependency at deploy time.
  resourceGroupName: 'data',
})
