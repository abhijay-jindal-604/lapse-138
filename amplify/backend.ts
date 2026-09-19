import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { draftNotice } from './functions/draftNotice/resource';
import { extractFacts } from './functions/extractFacts/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  draftNotice,
  extractFacts,
});

// extractFacts fetches the uploaded document straight from S3 by key
// (M3-T1); the bucket name isn't known until this point, so it's wired here
// rather than in defineFunction's static `environment`. The grant is also
// done here, rather than via storage/resource.ts's `allow.resource()`, to
// avoid a circular dependency between the storage and data nested stacks —
// extractFacts lives in the data stack as a resolver.
backend.extractFacts.addEnvironment(
  'DOCUMENTS_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName,
);
backend.storage.resources.bucket.grantRead(backend.extractFacts.resources.lambda);
