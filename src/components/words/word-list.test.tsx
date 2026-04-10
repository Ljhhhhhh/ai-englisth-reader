import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WordList } from '@/components/words/word-list';

describe('WordList', () => {
  it('removes a word from the visible list after marking it remembered', async () => {
    const store = new Map<string, string>();

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem(key: string) {
          return store.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          store.set(key, value);
        },
      },
      configurable: true,
    });

    window.localStorage.setItem('ai-english-read-device-id', 'dev-1');
    window.localStorage.setItem(
      'ai-english-read-saved-words',
      JSON.stringify({
        'dev-1:welcome-to-deep-reading:absorb': {
          articleSlug: 'welcome-to-deep-reading',
          articleTitle: '更从容地读英文',
          deviceId: 'dev-1',
          lemma: 'absorb',
          meaning: '吸收',
          savedAt: Date.now(),
          sentenceId: 's3',
          sourceSentence:
            'When the reader feels absorbed instead of interrupted.',
          surface: 'absorbed',
        },
      }),
    );

    render(<WordList />);

    await screen.findByRole('button', { name: /^已记住$/i });
    fireEvent.click(screen.getByRole('button', { name: /^已记住$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /^已记住$/i }),
      ).not.toBeInTheDocument();
    });
  });
});
