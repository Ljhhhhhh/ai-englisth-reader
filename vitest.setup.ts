import "@testing-library/jest-dom/vitest";
import { beforeEach } from 'vitest';

function createMemoryStorage() {
  const store = new Map<string, string>();

  return {
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } satisfies Storage;
}

beforeEach(() => {
  const currentStorage =
    typeof window !== 'undefined' ? window.localStorage : undefined;

  if (
    !currentStorage ||
    typeof currentStorage.getItem !== 'function' ||
    typeof currentStorage.setItem !== 'function' ||
    typeof currentStorage.removeItem !== 'function' ||
    typeof currentStorage.clear !== 'function'
  ) {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    });
  }
});
