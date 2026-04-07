const LEARNING_EVENTS_KEY = 'ai-english-read-learning-events';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type LearningEventType =
  | 'article_started'
  | 'article_resumed'
  | 'word_lookup_opened'
  | 'word_saved'
  | 'quiz_started'
  | 'quiz_submitted'
  | 'article_completed';

export type LearningEventRecord = {
  articleSlug?: string;
  createdAt: number;
  deviceId: string;
  payload?: Record<string, string | number | boolean | null>;
  type: LearningEventType;
};

function readEvents(storage: StorageLike) {
  const raw = storage.getItem(LEARNING_EVENTS_KEY);
  if (!raw) {
    return [] as LearningEventRecord[];
  }

  try {
    return JSON.parse(raw) as LearningEventRecord[];
  } catch {
    return [] as LearningEventRecord[];
  }
}

function writeEvents(storage: StorageLike, events: LearningEventRecord[]) {
  storage.setItem(LEARNING_EVENTS_KEY, JSON.stringify(events));
}

export function listEvents(deviceId: string, storage: StorageLike) {
  return readEvents(storage)
    .filter((event) => event.deviceId === deviceId)
    .sort((left, right) => left.createdAt - right.createdAt);
}

export function hasEvent(
  input: { articleSlug?: string; deviceId: string; type: LearningEventType },
  storage: StorageLike,
) {
  return readEvents(storage).some(
    (event) =>
      event.deviceId === input.deviceId &&
      event.type === input.type &&
      event.articleSlug === input.articleSlug,
  );
}

export function recordEvent(
  input: Omit<LearningEventRecord, 'createdAt'>,
  storage: StorageLike,
  options?: { oncePerArticle?: boolean },
) {
  if (options?.oncePerArticle && hasEvent(input, storage)) {
    return null;
  }

  const nextEvent: LearningEventRecord = {
    ...input,
    createdAt: Date.now(),
  };

  const events = readEvents(storage);
  events.push(nextEvent);
  writeEvents(storage, events);
  return nextEvent;
}
