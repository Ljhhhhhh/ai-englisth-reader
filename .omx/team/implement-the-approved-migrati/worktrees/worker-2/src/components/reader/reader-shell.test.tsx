import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReaderShell } from '@/components/reader/reader-shell';
import { loadArticle } from '@/features/articles/article-service';
import { saveProgress } from '@/features/reader/progress-service';

vi.mock('@/lib/device-id', () => ({
  getOrCreateDeviceId: () => 'device-1',
}));

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 768px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('ReaderShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('enters the review panel after finishing reading', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    render(
      <ReaderShell
        article={article}
        navigation={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /进入正文开始精读/i }));
    fireEvent.click(
      await screen.findByRole('button', { name: /完成本篇阅读/i }),
    );

    expect(
      await screen.findByRole('heading', { name: /这一篇你已经读完了/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/如果你想逐句对照，再看全文译文/i),
    ).toBeInTheDocument();
  });

  it('rehydrates completed progress back into the review panel', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    saveProgress(
      {
        articleSlug: article.slug,
        currentStage: 'review',
        deviceId: 'device-1',
        isCompleted: true,
      },
      window.localStorage,
    );

    render(
      <ReaderShell
        article={article}
        navigation={{}}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: /这一篇你已经读完了/i }),
    ).toBeInTheDocument();
  });

  it('lets the reader return to intro after entering the article body', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    render(
      <ReaderShell
        article={article}
        navigation={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /进入正文开始精读/i }));
    expect(
      screen.getByRole('button', { name: /完成本篇阅读/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导读' }));

    expect(
      screen.getByRole('button', { name: /进入正文开始精读/i }),
    ).toBeInTheDocument();
  });

  it('saves the word-bank fields required by the intro save action', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        contextMeaning: article.growth_vocabulary[0].context_meaning,
        explanation: '这是一个值得先记住的核心词。',
        lemma: article.growth_vocabulary[0].word,
        meaning: article.growth_vocabulary[0].chinese_meaning,
        memoryHook: article.growth_vocabulary[0].memory_hook,
        mode: 'word',
        selectedText: article.growth_vocabulary[0].word,
        sourceSentence: article.paragraphs[0]?.sentences[0]?.text,
        usageExample: 'A guided introduction helps readers enter the topic smoothly.',
      }),
    } as Response);

    render(
      <ReaderShell
        article={article}
        navigation={{}}
      />,
    );

    fireEvent.click(
      (await screen.findAllByRole('button', { name: /保存到生词库/i }))[0],
    );

    await waitFor(() => {
      const savedWords = JSON.parse(
        window.localStorage.getItem('ai-english-read-saved-words') ?? '{}',
      ) as Record<string, Record<string, string>>;
      const [record] = Object.values(savedWords);

      expect(record).toMatchObject({
        chineseMeaning: expect.any(String),
        contextMeaning: article.growth_vocabulary[0].context_meaning,
        memoryHook: expect.any(String),
        usageExample: 'A guided introduction helps readers enter the topic smoothly.',
      });
    });
  });

  it('lets a non-vocabulary word explanation save into the word bank', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        contextMeaning: '这里指明确、能帮读者跟住文章的。',
        explanation: '这里不是“透明”，而是“明确、清楚”的支持。',
        lemma: 'clear',
        meaning: '清晰的',
        memoryHook: '把 clear support 记成“清楚的支撑”。',
        mode: 'word',
        selectedText: 'clear',
        sourceSentence:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
        usageExample:
          'Clear instructions help new readers build confidence quickly.',
      }),
    } as Response);

    render(
      <ReaderShell
        article={article}
        navigation={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /进入正文开始精读/i }));
    fireEvent.click(screen.getByText('clear'));
    fireEvent.click(screen.getByRole('button', { name: /看这个词/i }));

    expect(
      await screen.findByRole('button', { name: /保存到生词库/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /保存到生词库/i }));

    await waitFor(() => {
      const savedWords = JSON.parse(
        window.localStorage.getItem('ai-english-read-saved-words') ?? '{}',
      ) as Record<string, Record<string, string>>;
      const [record] = Object.values(savedWords);

      expect(record).toMatchObject({
        chineseMeaning: '清晰的',
        contextMeaning: '这里指明确、能帮读者跟住文章的。',
        lemma: 'clear',
        memoryHook: '把 clear support 记成“清楚的支撑”。',
        surface: 'clear',
        usageExample:
          'Clear instructions help new readers build confidence quickly.',
      });
    });
  });
});
