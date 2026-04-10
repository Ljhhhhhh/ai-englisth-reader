import { render, screen } from '@testing-library/react';
import { ReviewPanel } from '@/components/reader/review-panel';
import { loadArticle } from '@/features/articles/article-service';

describe('ReviewPanel', () => {
  it('centers review on comprehension before secondary details', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    render(<ReviewPanel article={article} savedWords={[]} />);

    expect(
      screen.getByRole('heading', { name: /这一篇你已经读完了/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/快速确认一下你刚刚读懂了什么/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/如果你想逐句对照，再看全文译文/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/许多学习者能读懂英文文章的一部分/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/这一篇暂时还没有留下要记住的词/i),
    ).toBeInTheDocument();
  });

  it('explains that remembered words no longer stay in the word list', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    render(<ReviewPanel article={article} savedWords={[]} />);

    expect(
      screen.getByText(/已记住的词不会再出现在这里/i),
    ).toBeInTheDocument();
  });
});
