import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { ArticleCard } from '@/components/home/article-card';

describe('ArticleCard hydration', () => {
  it('does not warn when the summary paragraph gets external attributes before hydration', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const html = renderToString(
      <ArticleCard
        slug="welcome-to-deep-reading"
        title="更从容地读英文"
        difficulty="B1"
        estimatedMinutes={8}
        previewText="在上下文中读懂英语文章。"
      />,
    );

    const container = document.createElement('div');
    container.innerHTML = html;
    const summary = container.querySelectorAll('p')[1];

    summary?.setAttribute('xt-marked', 'ok');

    await act(async () => {
      hydrateRoot(
        container,
        <ArticleCard
          slug="welcome-to-deep-reading"
          title="更从容地读英文"
          difficulty="B1"
          estimatedMinutes={8}
          previewText="在上下文中读懂英语文章。"
        />,
      );
    });

    expect(consoleError).not.toHaveBeenCalled();
    expect(summary).toHaveAttribute('xt-marked', 'ok');

    consoleError.mockRestore();
  });
});
