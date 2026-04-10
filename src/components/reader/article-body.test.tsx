import { fireEvent, render, screen } from '@testing-library/react';
import { ArticleBody } from '@/components/reader/article-body';
import { loadArticle } from '@/features/articles/article-service';

function selectText(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe('ArticleBody', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers word explanation when a highlighted word is clicked', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const onExplainRequest = vi.fn();

    render(
      <ArticleBody
        activeParagraphId="p2"
        activeParagraphIndex={1}
        totalParagraphCount={article.paragraphs.length}
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        canGoPrevious
        canGoNext={false}
        isMobile={false}
        onContinueToReview={() => {}}
        onPreviousParagraph={() => {}}
        onNextParagraph={() => {}}
        onExplainRequest={onExplainRequest}
        onOpenMobileAssist={() => {}}
        onSelectionNotice={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guided' }));

    expect(onExplainRequest).toHaveBeenCalledWith({
      mode: 'word',
      selectedText: 'Guided',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
  });

  it('also triggers word explanation when a non-highlighted english word is clicked', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const onExplainRequest = vi.fn();

    render(
      <ArticleBody
        activeParagraphId="p2"
        activeParagraphIndex={1}
        totalParagraphCount={article.paragraphs.length}
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        canGoPrevious
        canGoNext={false}
        isMobile={false}
        onContinueToReview={() => {}}
        onPreviousParagraph={() => {}}
        onNextParagraph={() => {}}
        onExplainRequest={onExplainRequest}
        onOpenMobileAssist={() => {}}
        onSelectionNotice={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('clear'));

    expect(onExplainRequest).toHaveBeenCalledWith({
      mode: 'word',
      selectedText: 'clear',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
  });

  it('triggers phrase explanation after selecting adjacent words in one sentence', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const onExplainRequest = vi.fn();

    render(
      <ArticleBody
        activeParagraphId="p2"
        activeParagraphIndex={1}
        totalParagraphCount={article.paragraphs.length}
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        canGoPrevious
        canGoNext={false}
        isMobile={false}
        onContinueToReview={() => {}}
        onPreviousParagraph={() => {}}
        onNextParagraph={() => {}}
        onExplainRequest={onExplainRequest}
        onOpenMobileAssist={() => {}}
        onSelectionNotice={() => {}}
      />,
    );

    const clearWord = screen.getByText('clear');
    const supportWord = screen.getByText('support');

    selectText(
      clearWord.firstChild ?? clearWord,
      0,
      supportWord.firstChild ?? supportWord,
      'support'.length,
    );
    fireEvent.mouseUp(clearWord.closest('p')!);

    expect(onExplainRequest).toHaveBeenCalledWith({
      mode: 'phrase',
      selectedText: 'clear support',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
  });

  it('keeps phrase selection working even when native selection includes punctuation', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const onExplainRequest = vi.fn();

    render(
      <ArticleBody
        activeParagraphId="p2"
        activeParagraphIndex={1}
        totalParagraphCount={article.paragraphs.length}
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        canGoPrevious
        canGoNext={false}
        isMobile={false}
        onContinueToReview={() => {}}
        onPreviousParagraph={() => {}}
        onNextParagraph={() => {}}
        onExplainRequest={onExplainRequest}
        onOpenMobileAssist={() => {}}
        onSelectionNotice={() => {}}
      />,
    );

    const clearWord = screen.getByText('clear');
    const supportWord = screen.getByText('support');
    const punctuationNode = supportWord.nextElementSibling?.firstChild as Node | null;

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(clearWord.firstChild ?? clearWord, 0);
    range.setEnd(punctuationNode ?? (supportWord.firstChild ?? supportWord), 1);
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseUp(clearWord.closest('p')!);

    expect(onExplainRequest).toHaveBeenCalledWith({
      mode: 'phrase',
      selectedText: 'clear support',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
  });

  it('shows a short notice instead of requesting when the selection is too long', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const onExplainRequest = vi.fn();
    const onSelectionNotice = vi.fn();

    render(
      <ArticleBody
        activeParagraphId="p2"
        activeParagraphIndex={1}
        totalParagraphCount={article.paragraphs.length}
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        canGoPrevious
        canGoNext={false}
        isMobile={false}
        onContinueToReview={() => {}}
        onPreviousParagraph={() => {}}
        onNextParagraph={() => {}}
        onExplainRequest={onExplainRequest}
        onOpenMobileAssist={() => {}}
        onSelectionNotice={onSelectionNotice}
      />,
    );

    const readerWord = screen.getByText('reader');
    const focusWord = screen.getByText('focus');

    selectText(
      readerWord.firstChild ?? readerWord,
      0,
      focusWord.firstChild ?? focusWord,
      'focus'.length,
    );
    fireEvent.mouseUp(readerWord.closest('p')!);

    expect(onExplainRequest).not.toHaveBeenCalled();
    expect(onSelectionNotice).toHaveBeenCalledWith('selection_too_long');
  });

  it('shows different operation hints for desktop and mobile', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const noopProps = {
      activeParagraphId: 'p2',
      activeParagraphIndex: 1,
      totalParagraphCount: article.paragraphs.length,
      article,
      lookupableWords: new Set(['guided', 'panic']),
      canGoPrevious: true,
      canGoNext: false,
      onContinueToReview: () => {},
      onPreviousParagraph: () => {},
      onNextParagraph: () => {},
      onExplainRequest: () => {},
      onOpenMobileAssist: () => {},
      onSelectionNotice: () => {},
    };

    const { rerender } = render(<ArticleBody {...noopProps} isMobile={false} />);
    expect(
      screen.getByText(/点词可快查，划几个相邻英文词可看短语讲解/i),
    ).toBeInTheDocument();

    rerender(<ArticleBody {...noopProps} isMobile />);
    expect(
      screen.getByText(/点词可快查，长按单词可直接挑短语讲解/i),
    ).toBeInTheDocument();
  });

  it('opens the mobile assist after a long press on a word', async () => {
    vi.useFakeTimers();
    const article = await loadArticle('welcome-to-deep-reading');
    const onOpenMobileAssist = vi.fn();

    render(
      <ArticleBody
        activeParagraphId="p2"
        activeParagraphIndex={1}
        totalParagraphCount={article.paragraphs.length}
        article={article}
        lookupableWords={new Set(['guided', 'panic'])}
        canGoPrevious
        canGoNext={false}
        isMobile
        onContinueToReview={() => {}}
        onPreviousParagraph={() => {}}
        onNextParagraph={() => {}}
        onExplainRequest={() => {}}
        onOpenMobileAssist={onOpenMobileAssist}
        onSelectionNotice={() => {}}
      />,
    );

    const guidedButton = screen.getByRole('button', { name: 'Guided' });
    fireEvent.touchStart(guidedButton);
    vi.advanceTimersByTime(450);

    expect(onOpenMobileAssist).toHaveBeenCalledWith({
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      selectedText: 'Guided',
    });

    fireEvent.touchEnd(guidedButton);
  });
});
