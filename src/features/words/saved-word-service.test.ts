import {
  countSavedWords,
  isWordSaved,
  listSavedWords,
  listSavedWordsByArticle,
  saveWord,
  unsaveWord,
} from './saved-word-service';
import {
  isItemRemembered,
  rememberItem,
  type RememberedItemRecord,
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

function createSavedWordInput() {
  return {
    articleSlug: 'welcome-to-deep-reading',
    articleTitle: '更从容地读英文',
    chineseMeaning: '吸收',
    deviceId: 'dev-1',
    lemma: 'absorb',
    memoryHook: '像海绵吸水一样记住 absorb。',
    sentenceId: 's3',
    sourceSentence: 'When the reader feels absorbed instead of interrupted.',
    surface: 'absorbed',
    usageExample: 'The team became absorbed in solving the final bug before launch.',
  };
}

describe('saved-word-service', () => {
  it('does not create dirty duplicates when saving the same word twice in one article', () => {
    const storage = createMemoryStorage();

    saveWord(createSavedWordInput(), storage);
    saveWord(createSavedWordInput(), storage);

    expect(countSavedWords('dev-1', storage)).toBe(1);
    expect(
      isWordSaved(
        {
          articleSlug: 'welcome-to-deep-reading',
          deviceId: 'dev-1',
          lemma: 'absorb',
        },
        storage,
      ),
    ).toBe(true);
  });

  it('removes a saved word cleanly', () => {
    const storage = createMemoryStorage();

    saveWord(createSavedWordInput(), storage);

    expect(
      unsaveWord(
        {
          articleSlug: 'welcome-to-deep-reading',
          deviceId: 'dev-1',
          lemma: 'absorb',
        },
        storage,
      ),
    ).toBe(true);
    expect(countSavedWords('dev-1', storage)).toBe(0);
  });

  it('shows saved words grouped by source article', () => {
    const storage = createMemoryStorage();

    saveWord(createSavedWordInput(), storage);

    const groups = listSavedWordsByArticle('dev-1', storage);
    expect(groups[0]).toMatchObject({
      articleSlug: expect.any(String),
      words: expect.any(Array),
    });
  });

  it('stores the explanation, memory hook, and usage example needed by the word bank', () => {
    const storage = createMemoryStorage();

    saveWord(
      {
        ...createSavedWordInput(),
        memoryHook: '把海绵吸水的画面和 absorb 连起来记。',
        usageExample:
          'The team became absorbed in solving the final bug before launch.',
      },
      storage,
    );

    expect(listSavedWords('dev-1', storage)[0]).toMatchObject({
      chineseMeaning: '吸收',
      memoryHook: '把海绵吸水的画面和 absorb 连起来记。',
      usageExample:
        'The team became absorbed in solving the final bug before launch.',
    });
  });

  it('maps legacy meaning-only records to the new word-bank fields', () => {
    const storage = createMemoryStorage();

    storage.setItem(
      'ai-english-read-saved-words',
      JSON.stringify({
        'dev-1:welcome-to-deep-reading:absorb': {
          articleSlug: 'welcome-to-deep-reading',
          articleTitle: '更从容地读英文',
          deviceId: 'dev-1',
          lemma: 'absorb',
          meaning: '吸收',
          savedAt: 1,
          sentenceId: 's3',
          sourceSentence:
            'When the reader feels absorbed instead of interrupted.',
          surface: 'absorbed',
        },
      }),
    );

    expect(listSavedWords('dev-1', storage)[0]).toMatchObject({
      chineseMeaning: '吸收',
      memoryHook: '吸收',
      usageExample: '吸收',
    });
  });

  it('moves a saved word out of the review queue once it is remembered', () => {
    const storage = createMemoryStorage();

    saveWord(createSavedWordInput(), storage);

    const remembered = rememberItem(
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

    unsaveWord(
      {
        articleSlug: 'welcome-to-deep-reading',
        deviceId: 'dev-1',
        lemma: 'absorb',
      },
      storage,
    );

    expect(remembered).toMatchObject<Partial<RememberedItemRecord>>({
      deviceId: 'dev-1',
      term: 'absorb',
      type: 'word',
    });
    expect(countSavedWords('dev-1', storage)).toBe(0);
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
  });

  it('re-adding a remembered word to saved words can coexist with remembered cleanup', () => {
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

    saveWord(createSavedWordInput(), storage);

    expect(countSavedWords('dev-1', storage)).toBe(1);
    expect(
      isWordSaved(
        {
          articleSlug: 'welcome-to-deep-reading',
          deviceId: 'dev-1',
          lemma: 'absorb',
        },
        storage,
      ),
    ).toBe(true);
  });
});
