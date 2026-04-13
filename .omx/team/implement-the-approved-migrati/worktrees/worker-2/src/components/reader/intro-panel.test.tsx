import { fireEvent, render, screen } from '@testing-library/react';
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

  it('shows save and remember actions for vocabulary and phrase cards', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    render(
      <IntroPanel
        article={article}
        onRememberPhrase={() => {}}
        onRememberWord={() => {}}
        onSaveWord={() => {}}
        onStartReading={() => {}}
        rememberedPhrases={[]}
        rememberedWords={[]}
        savedWords={[]}
      />,
    );

    expect(screen.getAllByRole('button', { name: /保存到生词库/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^已记住$/i }).length).toBeGreaterThan(0);
  });

  it('shows remembered state and allows re-adding a remembered vocabulary word', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const handleSaveWord = vi.fn();

    render(
      <IntroPanel
        article={article}
        onRememberPhrase={() => {}}
        onRememberWord={() => {}}
        onSaveWord={handleSaveWord}
        onStartReading={() => {}}
        rememberedPhrases={[]}
        rememberedWords={[article.growth_vocabulary[0].word]}
        savedWords={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /重新加入生词库/i }));

    expect(handleSaveWord).toHaveBeenCalledWith(article.growth_vocabulary[0].word);
  });
});
