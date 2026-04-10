import { fireEvent, render, screen } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('button', { name: /完成本篇阅读/i }));

    expect(
      screen.getByRole('heading', { name: /这一篇你已经读完了/i }),
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
});
