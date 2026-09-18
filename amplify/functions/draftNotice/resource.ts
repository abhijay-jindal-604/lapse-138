import { defineFunction } from '@aws-amplify/backend'

export const draftNotice = defineFunction({
  name: 'draft-notice',
  entry: './handler.ts',
})
