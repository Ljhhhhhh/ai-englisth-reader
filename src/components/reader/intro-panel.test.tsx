import { render, screen } from '@testing-library/react';
import { IntroPanel } from '@/components/reader/intro-panel';
import { loadArticle } from '@/features/articles/article-service';

describe('IntroPanel', () => {
  it('keeps the entry screen focused by removing explanatory copy', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    render(<IntroPanel article={article} onStartReading={() => {}} />);

    expect(
      screen.queryByText(/先在这一页把核心词汇、语法点和难句预热一遍/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/先熟悉这篇文章里最关键的词/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/每条语法提示都对应文章里的真实句子/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/先在这里拆开最难的句型/i),
    ).not.toBeInTheDocument();
  });
});
