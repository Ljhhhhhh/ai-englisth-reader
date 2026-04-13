type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const REMEMBERED_ITEMS_KEY = 'ai-english-read-remembered-items';

export type RememberedItemType = 'word' | 'phrase';

export type RememberedItemRecord = {
  deviceId: string;
  displayText: string;
  meaning: string;
  rememberedAt: number;
  savedFromArticleSlug: string;
  savedFromArticleTitle: string;
  term: string;
  type: RememberedItemType;
};

type RememberItemInput = Omit<RememberedItemRecord, 'rememberedAt'>;

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

function createRememberedItemKey(
  deviceId: string,
  type: RememberedItemType,
  term: string,
) {
  return `${deviceId}:${type}:${normalizeTerm(term)}`;
}

function readRememberedItemMap(storage: StorageLike) {
  const raw = storage.getItem(REMEMBERED_ITEMS_KEY);
  if (!raw) {
    return {} as Record<string, RememberedItemRecord>;
  }

  try {
    return JSON.parse(raw) as Record<string, RememberedItemRecord>;
  } catch {
    return {} as Record<string, RememberedItemRecord>;
  }
}

function writeRememberedItemMap(
  storage: StorageLike,
  rememberedItemMap: Record<string, RememberedItemRecord>,
) {
  storage.setItem(REMEMBERED_ITEMS_KEY, JSON.stringify(rememberedItemMap));
}

export function rememberItem(input: RememberItemInput, storage: StorageLike) {
  const rememberedItemMap = readRememberedItemMap(storage);
  const recordKey = createRememberedItemKey(
    input.deviceId,
    input.type,
    input.term,
  );
  const existing = rememberedItemMap[recordKey];

  const nextRecord: RememberedItemRecord = {
    ...input,
    rememberedAt: existing?.rememberedAt ?? Date.now(),
    term: normalizeTerm(input.term),
  };

  rememberedItemMap[recordKey] = nextRecord;
  writeRememberedItemMap(storage, rememberedItemMap);
  return nextRecord;
}

export function forgetRememberedItem(
  input: { deviceId: string; term: string; type: RememberedItemType },
  storage: StorageLike,
) {
  const rememberedItemMap = readRememberedItemMap(storage);
  const recordKey = createRememberedItemKey(
    input.deviceId,
    input.type,
    input.term,
  );

  if (!rememberedItemMap[recordKey]) {
    return false;
  }

  delete rememberedItemMap[recordKey];
  writeRememberedItemMap(storage, rememberedItemMap);
  return true;
}

export function isItemRemembered(
  input: { deviceId: string; term: string; type: RememberedItemType },
  storage: StorageLike,
) {
  const rememberedItemMap = readRememberedItemMap(storage);
  return Boolean(
    rememberedItemMap[
      createRememberedItemKey(input.deviceId, input.type, input.term)
    ],
  );
}

export function listRememberedItems(deviceId: string, storage: StorageLike) {
  return Object.values(readRememberedItemMap(storage))
    .filter((record) => record.deviceId === deviceId)
    .sort((left, right) => right.rememberedAt - left.rememberedAt);
}
