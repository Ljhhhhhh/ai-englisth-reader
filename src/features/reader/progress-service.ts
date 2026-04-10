import {
  getCompletionState,
  normalizeStage,
  type ReaderStage,
} from './stage-machine';

const READER_PROGRESS_KEY = 'ai-english-read-reader-progress';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type ReaderProgressRecord = {
  articleSlug: string;
  currentStage: ReaderStage;
  deviceId: string;
  isCompleted: boolean;
  updatedAt: number;
};

type SaveProgressInput = {
  articleSlug: string;
  currentStage: ReaderStage;
  deviceId: string;
  isCompleted?: boolean;
};

function createRecordKey(deviceId: string, articleSlug: string) {
  return `${deviceId}:${articleSlug}`;
}

function readProgressMap(storage: StorageLike) {
  const raw = storage.getItem(READER_PROGRESS_KEY);
  if (!raw) {
    return {} as Record<string, ReaderProgressRecord>;
  }

  try {
    return JSON.parse(raw) as Record<string, ReaderProgressRecord>;
  } catch {
    return {} as Record<string, ReaderProgressRecord>;
  }
}

function writeProgressMap(
  storage: StorageLike,
  progressMap: Record<string, ReaderProgressRecord>,
) {
  storage.setItem(READER_PROGRESS_KEY, JSON.stringify(progressMap));
}

export function loadProgress(
  deviceId: string,
  articleSlug: string,
  storage: StorageLike,
) {
  const progressMap = readProgressMap(storage);
  return progressMap[createRecordKey(deviceId, articleSlug)] ?? null;
}

export function saveProgress(input: SaveProgressInput, storage: StorageLike) {
  const progressMap = readProgressMap(storage);
  const recordKey = createRecordKey(input.deviceId, input.articleSlug);
  const existing = progressMap[recordKey];

  const nextRecord: ReaderProgressRecord = {
    articleSlug: input.articleSlug,
    currentStage: normalizeStage(input.currentStage),
    deviceId: input.deviceId,
    isCompleted: input.isCompleted ?? existing?.isCompleted ?? false,
    updatedAt: Date.now(),
  };

  progressMap[recordKey] = nextRecord;
  writeProgressMap(storage, progressMap);
  return nextRecord;
}

export function listRecentProgress(deviceId: string, storage: StorageLike) {
  const progressMap = readProgressMap(storage);

  return Object.values(progressMap)
    .filter((record) => record.deviceId === deviceId)
    .sort((left, right) => {
      const leftCompletion = getCompletionState(left);
      const rightCompletion = getCompletionState(right);

      if (leftCompletion !== rightCompletion) {
        return leftCompletion === 'in-progress' ? -1 : 1;
      }

      return right.updatedAt - left.updatedAt;
    });
}
