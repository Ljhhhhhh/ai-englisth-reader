type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const SAVED_WORDS_KEY = 'ai-english-read-saved-words';

export type SavedWordRecord = {
  articleSlug: string;
  articleTitle: string;
  deviceId: string;
  lemma: string;
  meaning: string;
  savedAt: number;
  sentenceId: string;
  sourceSentence: string;
  surface: string;
};

export type SavedWordsByArticleGroup = {
  articleSlug: string;
  articleTitle: string;
  words: SavedWordRecord[];
};

type SaveWordInput = Omit<SavedWordRecord, 'savedAt'>;

function normalizeWordKey(value: string) {
  return value.trim().toLowerCase();
}

function createSavedWordKey(
  deviceId: string,
  articleSlug: string,
  lemma: string,
) {
  return `${deviceId}:${articleSlug}:${normalizeWordKey(lemma)}`;
}

function readSavedWordMap(storage: StorageLike) {
  const raw = storage.getItem(SAVED_WORDS_KEY);
  if (!raw) {
    return {} as Record<string, SavedWordRecord>;
  }

  try {
    return JSON.parse(raw) as Record<string, SavedWordRecord>;
  } catch {
    return {} as Record<string, SavedWordRecord>;
  }
}

function writeSavedWordMap(
  storage: StorageLike,
  savedWordMap: Record<string, SavedWordRecord>,
) {
  storage.setItem(SAVED_WORDS_KEY, JSON.stringify(savedWordMap));
}

export function saveWord(input: SaveWordInput, storage: StorageLike) {
  const savedWordMap = readSavedWordMap(storage);
  const recordKey = createSavedWordKey(
    input.deviceId,
    input.articleSlug,
    input.lemma,
  );
  const existing = savedWordMap[recordKey];

  const nextRecord: SavedWordRecord = {
    ...input,
    savedAt: existing?.savedAt ?? Date.now(),
  };

  savedWordMap[recordKey] = nextRecord;
  writeSavedWordMap(storage, savedWordMap);
  return nextRecord;
}

export function unsaveWord(
  input: { articleSlug: string; deviceId: string; lemma: string },
  storage: StorageLike,
) {
  const savedWordMap = readSavedWordMap(storage);
  const recordKey = createSavedWordKey(
    input.deviceId,
    input.articleSlug,
    input.lemma,
  );

  if (!savedWordMap[recordKey]) {
    return false;
  }

  delete savedWordMap[recordKey];
  writeSavedWordMap(storage, savedWordMap);
  return true;
}

export function isWordSaved(
  input: { articleSlug: string; deviceId: string; lemma: string },
  storage: StorageLike,
) {
  const savedWordMap = readSavedWordMap(storage);
  return Boolean(
    savedWordMap[
      createSavedWordKey(input.deviceId, input.articleSlug, input.lemma)
    ],
  );
}

export function listSavedWords(
  deviceId: string,
  storage: StorageLike,
  articleSlug?: string,
) {
  return Object.values(readSavedWordMap(storage))
    .filter((record) => record.deviceId === deviceId)
    .filter((record) => !articleSlug || record.articleSlug === articleSlug)
    .sort((left, right) => right.savedAt - left.savedAt);
}

export function countSavedWords(deviceId: string, storage: StorageLike) {
  return listSavedWords(deviceId, storage).length;
}

export function listSavedWordsByArticle(
  deviceId: string,
  storage: StorageLike,
) {
  const groupedWords = new Map<string, SavedWordsByArticleGroup>();

  for (const word of listSavedWords(deviceId, storage)) {
    const existing = groupedWords.get(word.articleSlug);

    if (existing) {
      existing.words.push(word);
      continue;
    }

    groupedWords.set(word.articleSlug, {
      articleSlug: word.articleSlug,
      articleTitle: word.articleTitle,
      words: [word],
    });
  }

  return [...groupedWords.values()];
}
