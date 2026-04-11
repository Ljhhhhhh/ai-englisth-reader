import { fireEvent, render, screen } from '@testing-library/react';
import { ArticleBody } from '@/components/reader/article-body';
import { loadArticle } from '@/features/articles/article-service';

describe('ArticleBody', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function createReaderArticle() {
    const loadedArticle = await loadArticle('welcome-to-deep-reading');

    return {
      ...loadedArticle,
      title: 'Welcome to Deep Reading',
      chinese_title: '更从容地读英文',
      paragraphs: loadedArticle.paragraphs.map((paragraph, index) => ({
        ...paragraph,
        translation:
          index === 0
            ? '许多学习者能读懂英文文章的一部分，但意思模糊时容易失去信心。'
            : '在清晰支持的引导下，读者可以更稳地跟住文章主线。',
      })),
    };
  }

  it('selects a word and lets the reader explicitly request word explanation', async () => {
    const article = await createReaderArticle();
    const onExplainRequest = vi.fn();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={onExplainRequest}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Many' }));
    expect(screen.getByLabelText(/正文讲解操作/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /看这个词/i }));

    expect(onExplainRequest).toHaveBeenCalledWith({
      mode: 'word',
      selectedText: 'Many',
      sentenceId: 's1',
      sentenceText:
        'Many learners can read part of an English article but lose confidence when the meaning starts to blur.',
    });
  });

  it('also supports explicit word explanation for a non-highlighted english word', async () => {
    const article = await createReaderArticle();
    const onExplainRequest = vi.fn();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={onExplainRequest}
      />,
    );

    fireEvent.click(screen.getByText('clear'));
    fireEvent.click(screen.getByRole('button', { name: /看这个词/i }));

    expect(onExplainRequest).toHaveBeenCalledWith({
      mode: 'word',
      selectedText: 'clear',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
  });

  it('lets the reader expand from a selected word into a phrase before requesting explanation', async () => {
    const article = await createReaderArticle();
    const onExplainRequest = vi.fn();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={onExplainRequest}
      />,
    );

    fireEvent.click(screen.getByText('clear'));
    fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));
    expect(screen.getByText('clear support')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /讲解短语/i }));

    expect(onExplainRequest).toHaveBeenCalledWith({
      mode: 'phrase',
      selectedText: 'clear support',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
  });

  it('shows phrase controls only after selection has been expanded', async () => {
    const article = await createReaderArticle();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('clear'));

    expect(
      screen.queryByRole('button', { name: /讲解短语/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));

    expect(
      screen.getByRole('button', { name: /讲解短语/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /看这个词/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the selected phrase visible until the reader clears it', async () => {
    const article = await createReaderArticle();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('clear'));
    fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));

    expect(screen.getByText('clear support')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /清除选择/i }));

    expect(screen.queryByText('clear support')).not.toBeInTheDocument();
  });

  it('clears the current selection when clicking non-interactive reading area', async () => {
    const article = await createReaderArticle();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByLabelText(/正文讲解操作/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/点词即查；再点相邻词可扩成短语/i));

    expect(screen.queryByLabelText(/正文讲解操作/i)).not.toBeInTheDocument();
  });

  it('stops offering further expansion once the selection reaches six words', async () => {
    const article = await createReaderArticle();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('clear'));
    fireEvent.click(screen.getByRole('button', { name: /向左扩展/i }));
    fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));
    fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));
    fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));
    fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));

    expect(screen.getByLabelText(/正文讲解操作/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /向右扩展/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /讲解短语/i }),
    ).toBeInTheDocument();
  });

  it('shows the same explicit operation hint for desktop and mobile', async () => {
    const article = await createReaderArticle();
    const noopProps = {
      article,
      lookupableWords: new Set(['guided', 'panic']),
      onCompleteReading: () => {},
      onExplainRequest: () => {},
    };

    const { rerender } = render(<ArticleBody {...noopProps} />);
    expect(
      screen.getByText(/点词即查；再点相邻词可扩成短语/i),
    ).toBeInTheDocument();

    rerender(<ArticleBody {...noopProps} />);
    expect(
      screen.getByText(/点词即查；再点相邻词可扩成短语/i),
    ).toBeInTheDocument();
  });

  it('uses roving tabindex so keyboard users can move across words without tabbing through every token', async () => {
    const article = await createReaderArticle();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={() => {}}
      />,
    );

    const firstWord = screen.getByRole('button', { name: 'Many' });
    const secondWord = screen.getByRole('button', { name: 'learners' });

    expect(firstWord).toHaveAttribute('tabindex', '0');
    expect(secondWord).toHaveAttribute('tabindex', '-1');

    firstWord.focus();
    fireEvent.keyDown(firstWord, { key: 'ArrowRight' });

    expect(secondWord).toHaveFocus();
    expect(secondWord).toHaveAttribute('tabindex', '0');

    fireEvent.click(secondWord);
    expect(
      screen.getByRole('group', { name: /正文讲解操作/i }),
    ).toBeInTheDocument();
  });

  it('shows an independent translation toggle for each paragraph and no segmented navigation controls', async () => {
    const article = await createReaderArticle();

    render(
      <ArticleBody
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        onCompleteReading={() => {}}
        onExplainRequest={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: /上一段/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下一段/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /进入复盘/i })).not.toBeInTheDocument();

    expect(screen.queryByText(/许多学习者能读懂英文文章的一部分/i)).not.toBeInTheDocument();
    const toggleButtons = screen.getAllByRole('button', { name: /显示译文/i });
    expect(toggleButtons).toHaveLength(2);

    fireEvent.click(toggleButtons[0]);
    expect(screen.getByText(/许多学习者能读懂英文文章的一部分/i)).toBeInTheDocument();
    expect(screen.queryByText(/在清晰支持的引导下，读者可以更稳地跟住文章主线/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /收起译文/i }));
    expect(screen.queryByText(/许多学习者能读懂英文文章的一部分/i)).not.toBeInTheDocument();
  });
});
