import type { LlmDebugRecord } from './debug-types';

type StoredDebugRecord = {
  record: LlmDebugRecord;
  updatedAt: number;
};

const STORE_TTL_MS = 30 * 60 * 1000;
const STORE_KEY_PREFIX = 'generate:';

declare global {
  var __LEXORA_LLM_DEBUG_STORE__:
    | Map<string, StoredDebugRecord>
    | undefined;
}

function getStore() {
  if (!globalThis.__LEXORA_LLM_DEBUG_STORE__) {
    globalThis.__LEXORA_LLM_DEBUG_STORE__ = new Map();
  }

  return globalThis.__LEXORA_LLM_DEBUG_STORE__;
}

function createGenerateKey(jobId: string, userId: string) {
  return `${STORE_KEY_PREFIX}${userId}:${jobId}`;
}

function cleanupExpiredEntries(now = Date.now()) {
  const store = getStore();

  for (const [key, value] of store.entries()) {
    if (now - value.updatedAt > STORE_TTL_MS) {
      store.delete(key);
    }
  }
}

export function setGenerateJobDebugRecord(input: {
  jobId: string;
  record: LlmDebugRecord;
  userId: string;
}) {
  // Dev-only transport for the browser debug panel. This does not attempt
  // cross-process durability and is intentionally scoped to the local runtime.
  cleanupExpiredEntries();
  getStore().set(createGenerateKey(input.jobId, input.userId), {
    record: input.record,
    updatedAt: Date.now(),
  });
}

export function getGenerateJobDebugRecord(input: {
  jobId: string;
  userId: string;
}) {
  cleanupExpiredEntries();

  return (
    getStore().get(createGenerateKey(input.jobId, input.userId))?.record ?? null
  );
}

export function clearGenerateJobDebugRecord(input: {
  jobId: string;
  userId: string;
}) {
  getStore().delete(createGenerateKey(input.jobId, input.userId));
}
