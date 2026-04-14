import type { GenerationStageName } from './generation-job-schema';
import {
  parseLiveStageDraft,
  type LiveStageDraft,
} from './live-stage-schema';

const STORE_TTL_MS = 30 * 60 * 1000;

declare global {
  var __LEXORA_LIVE_STAGE_STORE__:
    | Map<string, { draft: LiveStageDraft; touchedAt: number }>
    | undefined;
}

function getStore() {
  if (!globalThis.__LEXORA_LIVE_STAGE_STORE__) {
    globalThis.__LEXORA_LIVE_STAGE_STORE__ = new Map();
  }

  return globalThis.__LEXORA_LIVE_STAGE_STORE__;
}

function createKey(jobId: string, stage: GenerationStageName) {
  return `${jobId}:${stage}`;
}

function cleanupExpiredEntries(now = Date.now()) {
  const store = getStore();

  for (const [key, value] of store.entries()) {
    if (now - value.touchedAt > STORE_TTL_MS) {
      store.delete(key);
    }
  }
}

function compareDraftVersion(next: LiveStageDraft, current: LiveStageDraft) {
  if (next.attempt !== current.attempt) {
    return next.attempt - current.attempt;
  }

  const updatedDelta =
    new Date(next.updatedAt).getTime() - new Date(current.updatedAt).getTime();
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  return next.text.length - current.text.length;
}

export function setLiveStageDraft(
  draft: LiveStageDraft,
  options: { now?: number } = {},
) {
  const now = options.now ?? Date.now();
  cleanupExpiredEntries(now);

  const normalized = parseLiveStageDraft(draft);
  const key = createKey(normalized.jobId, normalized.stage);
  const existing = getStore().get(key)?.draft;

  if (existing && compareDraftVersion(normalized, existing) < 0) {
    return existing;
  }

  getStore().set(key, {
    draft: normalized,
    touchedAt: now,
  });

  return normalized;
}

export function getLiveStageDraft(
  jobId: string,
  stage: GenerationStageName,
  options: { now?: number } = {},
) {
  cleanupExpiredEntries(options.now ?? Date.now());
  return getStore().get(createKey(jobId, stage))?.draft ?? null;
}

export function listLiveStageDraftsForJob(
  jobId: string,
  options: { now?: number } = {},
) {
  cleanupExpiredEntries(options.now ?? Date.now());

  return Array.from(getStore().values())
    .map((entry) => entry.draft)
    .filter((draft) => draft.jobId === jobId)
    .sort((left, right) => left.stage.localeCompare(right.stage));
}

export function clearLiveStageDraft(jobId: string, stage: GenerationStageName) {
  getStore().delete(createKey(jobId, stage));
}

export function clearLiveStageDraftsForJob(jobId: string) {
  const store = getStore();

  for (const key of store.keys()) {
    if (key.startsWith(`${jobId}:`)) {
      store.delete(key);
    }
  }
}

export function clearAllLiveStageDrafts() {
  getStore().clear();
}
