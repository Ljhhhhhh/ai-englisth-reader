import {
  forgetRememberedItem,
  isItemRemembered,
  listRememberedItems,
  rememberItem,
} from './remembered-item-service';

function createMemoryStorage() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('remembered-item-service', () => {
  it('stores remembered words globally per device', () => {
    const storage = createMemoryStorage();

    rememberItem(
      {
        deviceId: 'dev-1',
        displayText: 'absorbed',
        meaning: '吸收',
        savedFromArticleSlug: 'welcome-to-deep-reading',
        savedFromArticleTitle: '更从容地读英文',
        term: 'absorb',
        type: 'word',
      },
      storage,
    );

    expect(
      isItemRemembered(
        {
          deviceId: 'dev-1',
          term: 'absorb',
          type: 'word',
        },
        storage,
      ),
    ).toBe(true);
    expect(listRememberedItems('dev-1', storage)).toHaveLength(1);
  });

  it('stores phrases separately from words', () => {
    const storage = createMemoryStorage();

    rememberItem(
      {
        deviceId: 'dev-1',
        displayText: 'less panic',
        meaning: '更少慌乱',
        savedFromArticleSlug: 'welcome-to-deep-reading',
        savedFromArticleTitle: '更从容地读英文',
        term: 'less panic',
        type: 'phrase',
      },
      storage,
    );

    expect(
      isItemRemembered(
        {
          deviceId: 'dev-1',
          term: 'less panic',
          type: 'phrase',
        },
        storage,
      ),
    ).toBe(true);
  });

  it('forgets remembered items cleanly', () => {
    const storage = createMemoryStorage();

    rememberItem(
      {
        deviceId: 'dev-1',
        displayText: 'absorbed',
        meaning: '吸收',
        savedFromArticleSlug: 'welcome-to-deep-reading',
        savedFromArticleTitle: '更从容地读英文',
        term: 'absorb',
        type: 'word',
      },
      storage,
    );

    expect(
      forgetRememberedItem(
        {
          deviceId: 'dev-1',
          term: 'absorb',
          type: 'word',
        },
        storage,
      ),
    ).toBe(true);
    expect(listRememberedItems('dev-1', storage)).toHaveLength(0);
  });
});
