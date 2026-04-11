import { render, screen } from '@testing-library/react';
import WordsPage from '@/app/words/page';

vi.mock('@/components/words/word-list', () => ({
  WordList: () => <div>WordList</div>,
}));

describe('WordsPage', () => {
  it('shows a back-home link when opened from home', async () => {
    render(
      await WordsPage({
        searchParams: Promise.resolve({ from: 'home' }),
      }),
    );

    expect(
      screen.getByRole('link', { name: '返回首页' }),
    ).toHaveAttribute('href', '/');
  });

  it('shows a back-reader link when opened from the reader', async () => {
    render(
      await WordsPage({
        searchParams: Promise.resolve({
          articleSlug: 'welcome-to-deep-reading',
          from: 'reader',
        }),
      }),
    );

    expect(
      screen.getByRole('link', { name: '返回正文' }),
    ).toHaveAttribute('href', '/reader/welcome-to-deep-reading');
  });

  it('falls back to home when no source is provided', async () => {
    render(
      await WordsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole('link', { name: '返回首页' }),
    ).toHaveAttribute('href', '/');
  });
});
