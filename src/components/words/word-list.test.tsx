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
          chineseMeaning: '吸收',
          deviceId: 'dev-1',
          lemma: 'absorb',
          memoryHook: '把海绵吸水的画面和 absorb 连起来记。',
          savedAt: Date.now(),
          sentenceId: 's3',
          sourceSentence:
            'When the reader feels absorbed instead of interrupted.',
          surface: 'absorbed',
          usageExample:
            'The team became absorbed in solving the final bug before launch.',
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

  it('shows the three saved-word sections in the word bank', async () => {
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
          chineseMeaning: '吸收',
          deviceId: 'dev-1',
          lemma: 'absorb',
          memoryHook: '把海绵吸水的画面和 absorb 连起来记。',
          savedAt: Date.now(),
          sentenceId: 's3',
          sourceSentence:
            'When the reader feels absorbed instead of interrupted.',
          surface: 'absorbed',
          usageExample:
            'The team became absorbed in solving the final bug before launch.',
        },
      }),
    );

    render(<WordList />);

    expect(await screen.findByText('中文解释')).toBeInTheDocument();
    expect(screen.getByText('吸收')).toBeInTheDocument();
    expect(screen.getByText('助记讲解')).toBeInTheDocument();
    expect(
      screen.getByText('把海绵吸水的画面和 absorb 连起来记。'),
    ).toBeInTheDocument();
    expect(screen.getByText('常用场景')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The team became absorbed in solving the final bug before launch.',
      ),
    ).toBeInTheDocument();
  });

  it('uses the provided back action in the empty state', async () => {
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

    render(<WordList backHref="/reader/welcome-to-deep-reading" backLabel="返回正文" />);

    expect(await screen.findByRole('link', { name: '返回正文' })).toHaveAttribute(
      'href',
      '/reader/welcome-to-deep-reading',
    );
  });
});
