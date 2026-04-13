import { useRef, useState, type MouseEvent } from 'react';
import { SelectionActionBar } from '@/components/reader/selection-action-bar';
import {
  createWordSelection,
  expandSelectionLeft,
  expandSelectionRight,
  selectionToExplainText,
  type ReaderTokenSelection,
} from '@/features/reader/reader-selection-state';
import type { Article } from '@/lib/content/article-schema';
import { uiCopy } from '@/lib/ui-copy';

function normalizeToken(value: string) {
  return value.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
}

function tokenizeSentence(text: string) {
  return text.match(/[A-Za-z']+|[^A-Za-z']+/g) ?? [text];
}

function getSentenceWords(text: string) {
  return tokenizeSentence(text).filter((token) => /^[A-Za-z']+$/.test(token));
}

type ExplainRequest = {
  mode: 'word' | 'phrase';
  sentenceId: string;
  sentenceText: string;
  selectedText: string;
};

type ArticleBodyProps = {
  activeExplainRequest?: ExplainRequest | null;
  article: Article;
  lookupableWords: Set<string>;
  onCompleteReading: () => void;
  onExplainRequest: (input: ExplainRequest) => void;
};

function getSelectedText(selection: ActiveSelection) {
  return selection.selectedText;
}

function getSelectionWordCount(selection: ActiveSelection) {
  return selection.endWordIndex - selection.startWordIndex + 1;
}

type ActiveSelection = ReaderTokenSelection;

function selectionIncludesWord(selection: ActiveSelection, wordIndex: number) {
  return (
    wordIndex >= selection.startWordIndex && wordIndex <= selection.endWordIndex
  );
}

export function ArticleBody({
  activeExplainRequest = null,
  article,
  lookupableWords,
  onCompleteReading,
  onExplainRequest,
}: ArticleBodyProps) {
  const [expandedTranslations, setExpandedTranslations] = useState<
    Record<string, boolean>
  >({});
  const [focusWordIndexes, setFocusWordIndexes] = useState<
    Record<string, number>
  >({});
  const [activeSelection, setActiveSelection] =
    useState<ActiveSelection | null>(null);
  const wordButtonRefs = useRef<
    Record<string, Array<HTMLButtonElement | null>>
  >({});

  const articleView = article as Article & {
    chinese_title?: string;
    paragraphs: Array<
      Article['paragraphs'][number] & {
        translation?: string;
      }
    >;
  };

  function toggleTranslation(paragraphId: string) {
    setExpandedTranslations((current) => ({
      ...current,
      [paragraphId]: !current[paragraphId],
    }));
  }

  function setSentenceFocusIndex(sentenceId: string, wordIndex: number) {
    setFocusWordIndexes((current) => {
      if (current[sentenceId] === wordIndex) {
        return current;
      }

      return {
        ...current,
        [sentenceId]: wordIndex,
      };
    });
  }

  function focusSentenceWord(sentenceId: string, wordIndex: number) {
    setSentenceFocusIndex(sentenceId, wordIndex);
    wordButtonRefs.current[sentenceId]?.[wordIndex]?.focus();
  }

  function requestExplain(mode: 'word' | 'phrase') {
    if (!activeSelection) {
      return;
    }

    const phraseText =
      mode === 'phrase' ? selectionToExplainText(activeSelection) : null;

    if (mode === 'phrase' && !phraseText) {
      return;
    }

    onExplainRequest({
      mode,
      sentenceId: activeSelection.sentenceId,
      sentenceText: activeSelection.sentenceText,
      selectedText:
        mode === 'word'
          ? (activeSelection.tokens[activeSelection.startWordIndex] ?? '')
          : (phraseText ?? getSelectedText(activeSelection)),
    });
  }

  function clearSelectionFromBackgroundClick(event: MouseEvent<HTMLElement>) {
    if (!activeSelection) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (
      target.closest(
        'button, a, input, textarea, select, [role="button"], [data-selection-action-bar="true"]',
      )
    ) {
      return;
    }

    setActiveSelection(null);
  }

  return (
    <section
      onClickCapture={clearSelectionFromBackgroundClick}
      style={{ display: 'grid', gap: 20 }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0 }}>{article.title}</h1>
        {articleView.chinese_title ? (
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 18 }}>
            {articleView.chinese_title}
          </p>
        ) : null}
      </header>

      <div style={{ display: 'grid', gap: 16 }}>
        {articleView.paragraphs.map((paragraph, index) => {
          const translationExpanded =
            expandedTranslations[paragraph.id] ?? false;
          return (
            <article
              key={paragraph.id}
              style={{
                padding: 20,
                borderRadius: 22,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: 12 }}>
                {uiCopy.reader.articleBody.paragraphTitle(index + 1)}
              </strong>

              <div style={{ display: 'grid', gap: 12 }}>
                {paragraph.sentences.map((sentence) => {
                  const sentenceWords = getSentenceWords(sentence.text);

                  return (
                    <div key={sentence.id} style={{ display: 'grid', gap: 10 }}>
                      <p style={{ margin: 0, lineHeight: 1.8, fontSize: 18 }}>
                        {(() => {
                          let wordIndex = -1;

                          return tokenizeSentence(sentence.text).map(
                            (token, tokenIndex) => {
                              const normalized = normalizeToken(token);
                              const isWord = /^[A-Za-z']+$/.test(token);
                              const isPriorityWord =
                                lookupableWords.has(normalized);

                              if (isWord) {
                                wordIndex += 1;
                              }

                              if (!isWord) {
                                return (
                                  <span key={`${sentence.id}-${tokenIndex}`}>
                                    {token}
                                  </span>
                                );
                              }

                              const isSelected =
                                activeSelection?.sentenceId === sentence.id &&
                                selectionIncludesWord(
                                  activeSelection,
                                  wordIndex,
                                );
                              const currentWordIndex = wordIndex;
                              const isFocusableWord =
                                (focusWordIndexes[sentence.id] ?? 0) ===
                                currentWordIndex;

                              return (
                                <button
                                  key={`${sentence.id}-${tokenIndex}`}
                                  type="button"
                                  ref={(element) => {
                                    wordButtonRefs.current[sentence.id] ??= [];
                                    wordButtonRefs.current[sentence.id][
                                      currentWordIndex
                                    ] = element;
                                  }}
                                  tabIndex={isFocusableWord ? 0 : -1}
                                  onClick={() => {
                                    setSentenceFocusIndex(
                                      sentence.id,
                                      currentWordIndex,
                                    );
                                    setActiveSelection(
                                      createWordSelection({
                                        sentenceId: sentence.id,
                                        sentenceText: sentence.text,
                                        tokens: sentenceWords,
                                        wordIndex: currentWordIndex,
                                      }),
                                    );
                                  }}
                                  onFocus={() =>
                                    setSentenceFocusIndex(
                                      sentence.id,
                                      currentWordIndex,
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'ArrowRight') {
                                      event.preventDefault();
                                      focusSentenceWord(
                                        sentence.id,
                                        Math.min(
                                          currentWordIndex + 1,
                                          sentenceWords.length - 1,
                                        ),
                                      );
                                    } else if (event.key === 'ArrowLeft') {
                                      event.preventDefault();
                                      focusSentenceWord(
                                        sentence.id,
                                        Math.max(currentWordIndex - 1, 0),
                                      );
                                    } else if (event.key === 'Home') {
                                      event.preventDefault();
                                      focusSentenceWord(sentence.id, 0);
                                    } else if (event.key === 'End') {
                                      event.preventDefault();
                                      focusSentenceWord(
                                        sentence.id,
                                        sentenceWords.length - 1,
                                      );
                                    }
                                  }}
                                  data-reader-word="true"
                                  data-sentence-id={sentence.id}
                                  data-sentence-text={sentence.text}
                                  data-word-index={String(currentWordIndex)}
                                  data-token-index={String(tokenIndex)}
                                  aria-pressed={isSelected}
                                  style={{
                                    border: 'none',
                                    padding: '0 2px',
                                    background: isSelected
                                      ? 'rgba(197, 106, 45, 0.16)'
                                      : 'transparent',
                                    color: isPriorityWord
                                      ? 'var(--accent)'
                                      : 'var(--foreground)',
                                    cursor: 'pointer',
                                    font: 'inherit',
                                    textDecoration: isPriorityWord
                                      ? 'underline'
                                      : 'none',
                                    textUnderlineOffset: isPriorityWord
                                      ? 3
                                      : undefined,
                                    borderRadius: 6,
                                    outlineOffset: 2,
                                    boxShadow: isSelected
                                      ? '0 0 0 1px rgba(197, 106, 45, 0.28)'
                                      : 'none',
                                  }}
                                >
                                  {token}
                                </button>
                              );
                            },
                          );
                        })()}
                      </p>

                      {activeSelection?.sentenceId === sentence.id ? (
                        <SelectionActionBar
                          busyLabel={
                            activeExplainRequest &&
                            activeExplainRequest.sentenceId === sentence.id &&
                            activeExplainRequest.selectedText ===
                              getSelectedText(activeSelection)
                              ? activeExplainRequest.mode === 'word'
                                ? uiCopy.reader.selectionBar.busyWord
                                : uiCopy.reader.selectionBar.busyPhrase
                              : null
                          }
                          isBusy={Boolean(
                            activeExplainRequest &&
                            activeExplainRequest.sentenceId === sentence.id &&
                            activeExplainRequest.selectedText ===
                              getSelectedText(activeSelection),
                          )}
                          selectedText={getSelectedText(activeSelection)}
                          showExplainWord={
                            activeSelection.startWordIndex ===
                            activeSelection.endWordIndex
                          }
                          canExplainPhrase={
                            getSelectionWordCount(activeSelection) > 1 &&
                            selectionToExplainText(activeSelection) !== null
                          }
                          canExpandLeft={activeSelection.startWordIndex > 0}
                          canExpandRight={
                            activeSelection.endWordIndex <
                              activeSelection.tokens.length - 1 &&
                            getSelectionWordCount(activeSelection) < 6
                          }
                          onExplainWord={() => requestExplain('word')}
                          onExplainPhrase={() => requestExplain('phrase')}
                          onExpandLeft={() =>
                            setActiveSelection((current) =>
                              current
                                ? (expandSelectionLeft(current) ?? current)
                                : current,
                            )
                          }
                          onExpandRight={() =>
                            setActiveSelection((current) =>
                              current
                                ? (expandSelectionRight(current) ?? current)
                                : current,
                            )
                          }
                          onClear={() => setActiveSelection(null)}
                          labels={{
                            title: uiCopy.reader.selectionBar.title,
                            explainWord: uiCopy.reader.selectionBar.explainWord,
                            explainPhrase:
                              uiCopy.reader.selectionBar.explainPhrase,
                            expandLeft: uiCopy.reader.selectionBar.expandLeft,
                            expandRight: uiCopy.reader.selectionBar.expandRight,
                            clear: uiCopy.reader.selectionBar.clear,
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {paragraph.translation ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => toggleTranslation(paragraph.id)}
                    style={{
                      width: 'fit-content',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: '#fff8ee',
                      color: 'var(--foreground)',
                      padding: '10px 14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {translationExpanded
                      ? uiCopy.reader.articleBody.hideTranslation
                      : uiCopy.reader.articleBody.showTranslation}
                  </button>

                  {translationExpanded ? (
                    <p
                      style={{
                        margin: 0,
                        color: 'var(--muted)',
                        lineHeight: 1.7,
                      }}
                    >
                      {paragraph.translation}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onCompleteReading}
            style={{
              borderRadius: 999,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              padding: '14px 20px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {uiCopy.reader.articleBody.completeReading}
          </button>
        </div>
      </div>
    </section>
  );
}
