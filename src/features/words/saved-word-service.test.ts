import {
  countSavedWords,
  isWordSaved,
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

describe('saved-word-service', () => {
  it('does not create dirty duplicates when saving the same word twice in one article', () => {
    const storage = createMemoryStorage();

    saveWord(
      {
        articleSlug: 'welcome-to-deep-reading',
        articleTitle: '更从容地读英文',
        deviceId: 'dev-1',
        lemma: 'absorb',
        meaning: '吸收',
        sentenceId: 's3',
        sourceSentence:
          'When the reader feels absorbed instead of interrupted.',
        surface: 'absorbed',
      },
      storage,
    );
    saveWord(
      {
        articleSlug: 'welcome-to-deep-reading',
        articleTitle: '更从容地读英文',
        deviceId: 'dev-1',
        lemma: 'absorb',
        meaning: '吸收',
        sentenceId: 's3',
        sourceSentence:
          'When the reader feels absorbed instead of interrupted.',
        surface: 'absorbed',
      },
      storage,
    );

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

    saveWord(
      {
        articleSlug: 'welcome-to-deep-reading',
        articleTitle: '更从容地读英文',
        deviceId: 'dev-1',
        lemma: 'absorb',
        meaning: '吸收',
        sentenceId: 's3',
        sourceSentence:
          'When the reader feels absorbed instead of interrupted.',
        surface: 'absorbed',
      },
      storage,
    );

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

    saveWord(
      {
        articleSlug: 'welcome-to-deep-reading',
        articleTitle: '更从容地读英文',
        deviceId: 'dev-1',
        lemma: 'absorb',
        meaning: '吸收',
        sentenceId: 's3',
        sourceSentence:
          'When the reader feels absorbed instead of interrupted.',
        surface: 'absorbed',
      },
      storage,
    );

    const groups = listSavedWordsByArticle('dev-1', storage);
    expect(groups[0]).toMatchObject({
      articleSlug: expect.any(String),
      words: expect.any(Array),
    });
  });

  it('moves a saved word out of the review queue once it is remembered', () => {
    const storage = createMemoryStorage();

    saveWord(
      {
        articleSlug: 'welcome-to-deep-reading',
        articleTitle: '更从容地读英文',
        deviceId: 'dev-1',
        lemma: 'absorb',
        meaning: '吸收',
        sentenceId: 's3',
        sourceSentence:
          'When the reader feels absorbed instead of interrupted.',
        surface: 'absorbed',
      },
      storage,
    );

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

    saveWord(
      {
        articleSlug: 'welcome-to-deep-reading',
        articleTitle: '更从容地读英文',
        deviceId: 'dev-1',
        lemma: 'absorb',
        meaning: '吸收',
        sentenceId: 's3',
        sourceSentence:
          'When the reader feels absorbed instead of interrupted.',
        surface: 'absorbed',
      },
      storage,
    );

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
