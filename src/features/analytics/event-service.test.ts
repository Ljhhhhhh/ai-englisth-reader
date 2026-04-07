import { listEvents, recordEvent } from './event-service';

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

describe('event-service', () => {
  it('records start, lookup, save, quiz-submit, and complete events', () => {
    const storage = createMemoryStorage();

    recordEvent(
      {
        articleSlug: 'welcome-to-deep-reading',
        deviceId: 'dev-1',
        type: 'article_started',
      },
      storage,
    );
    recordEvent(
      {
        articleSlug: 'welcome-to-deep-reading',
        deviceId: 'dev-1',
        type: 'word_lookup_opened',
      },
      storage,
    );
    recordEvent(
      {
        articleSlug: 'welcome-to-deep-reading',
        deviceId: 'dev-1',
        type: 'word_saved',
      },
      storage,
    );
    recordEvent(
      {
        articleSlug: 'welcome-to-deep-reading',
        deviceId: 'dev-1',
        type: 'quiz_submitted',
      },
      storage,
    );
    recordEvent(
      {
        articleSlug: 'welcome-to-deep-reading',
        deviceId: 'dev-1',
        type: 'article_completed',
      },
      storage,
      { oncePerArticle: true },
    );

    expect(listEvents('dev-1', storage)).toHaveLength(5);
  });
});
