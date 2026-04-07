import {
  loadProgress,
  saveProgress,
  listRecentProgress,
} from './progress-service';

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

describe('progress-service', () => {
  it('restores last visited stage and paragraph for the same device', async () => {
    const storage = createMemoryStorage();

    saveProgress(
      {
        articleSlug: 'welcome-to-deep-reading',
        currentStage: 'read',
        deviceId: 'dev-1',
        paragraphId: 'p2',
      },
      storage,
    );

    const restored = loadProgress('dev-1', 'welcome-to-deep-reading', storage);

    expect(restored?.paragraphId).toBe('p2');
    expect(restored?.currentStage).toBe('read');
  });

  it('sorts in-progress articles ahead of completed ones for the same device', () => {
    const storage = createMemoryStorage();

    saveProgress(
      {
        articleSlug: 'welcome-to-deep-reading',
        currentStage: 'review',
        deviceId: 'dev-1',
      },
      storage,
    );
    saveProgress(
      {
        articleSlug: 'deep-reading-beats-scattered-lookup',
        currentStage: 'read',
        deviceId: 'dev-1',
      },
      storage,
    );

    const recent = listRecentProgress('dev-1', storage);
    expect(recent[0]?.articleSlug).toBe('deep-reading-beats-scattered-lookup');
  });
});
