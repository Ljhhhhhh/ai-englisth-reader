import { useEffect, useRef } from "react";
import type { Article } from "@/lib/content/article-schema";
import {
  normalizeExplainText,
  validateExplainSelection,
} from "@/features/reader/reader-explain-utils";
import { uiCopy } from "@/lib/ui-copy";

function normalizeToken(value: string) {
  return value.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").toLowerCase();
}

function tokenizeSentence(text: string) {
  return text.match(/[A-Za-z']+|[^A-Za-z']+/g) ?? [text];
}

type ArticleBodyProps = {
  activeParagraphId?: string;
  activeParagraphIndex: number;
  totalParagraphCount: number;
  article: Article;
  lookupableWords: Set<string>;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isMobile: boolean;
  onContinueToReview: () => void;
  onPreviousParagraph: () => void;
  onNextParagraph: () => void;
  onExplainRequest: (input: {
    mode: "word" | "phrase";
    sentenceId: string;
    sentenceText: string;
    selectedText: string;
  }) => void;
  onOpenMobileAssist: (input: {
    sentenceId: string;
    sentenceText: string;
    selectedText: string;
  }) => void;
  onSelectionNotice: (reason: "selection_invalid" | "selection_too_long") => void;
};

function findWordElement(target: Node | null) {
  if (!target) {
    return null;
  }

  const element = target instanceof Element ? target : target.parentElement;
  return element?.closest<HTMLElement>("[data-reader-word='true']") ?? null;
}

function findNearestWordElement(target: Node | null) {
  const directMatch = findWordElement(target);

  if (directMatch) {
    return directMatch;
  }

  const element = target instanceof Element ? target : target?.parentElement;

  if (!element) {
    return null;
  }

  let sibling: Element | null = element.previousElementSibling;

  while (sibling) {
    if (
      sibling instanceof HTMLElement &&
      sibling.dataset.readerWord === "true"
    ) {
      return sibling;
    }

    sibling = sibling.previousElementSibling;
  }

  sibling = element.nextElementSibling;

  while (sibling) {
    if (
      sibling instanceof HTMLElement &&
      sibling.dataset.readerWord === "true"
    ) {
      return sibling;
    }

    sibling = sibling.nextElementSibling;
  }

  return null;
}

export function ArticleBody({
  activeParagraphId,
  totalParagraphCount,
  article,
  lookupableWords,
  canGoPrevious,
  canGoNext,
  isMobile,
  onContinueToReview,
  onPreviousParagraph,
  onNextParagraph,
  onExplainRequest,
  onOpenMobileAssist,
  onSelectionNotice,
}: ArticleBodyProps) {
  const touchHoldTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const touchHoldTriggeredRef = useRef(false);

  function clearTouchHoldTimer() {
    if (touchHoldTimerRef.current) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  }

  useEffect(() => () => clearTouchHoldTimer(), []);

  function handleWordTouchStart(input: {
    sentenceId: string;
    sentenceText: string;
    selectedText: string;
  }) {
    if (!isMobile) {
      return;
    }

    touchHoldTriggeredRef.current = false;
    clearTouchHoldTimer();
    touchHoldTimerRef.current = window.setTimeout(() => {
      touchHoldTriggeredRef.current = true;
      onOpenMobileAssist(input);
    }, 420);
  }

  function handleWordTouchEnd() {
    clearTouchHoldTimer();
  }

  function handleSelectionEnd() {
    if (touchHoldTriggeredRef.current) {
      touchHoldTriggeredRef.current = false;
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      return;
    }

    const startWord = findNearestWordElement(selection.anchorNode);
    const endWord = findNearestWordElement(selection.focusNode);

    if (!startWord || !endWord) {
      selection.removeAllRanges();
      return;
    }

    const sentenceId = startWord.dataset.sentenceId;
    const sentenceText = startWord.dataset.sentenceText;
    const startIndex = Number(startWord.dataset.wordIndex);
    const endIndex = Number(endWord.dataset.wordIndex);

    if (
      !sentenceId ||
      !sentenceText ||
      sentenceId !== endWord.dataset.sentenceId ||
      Number.isNaN(startIndex) ||
      Number.isNaN(endIndex)
    ) {
      selection.removeAllRanges();
      onSelectionNotice("selection_invalid");
      return;
    }

    const wordElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        `[data-sentence-id="${sentenceId}"][data-reader-word='true']`,
      ),
    );
    const [fromIndex, toIndex] =
      startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const selectedWords = wordElements
      .filter((element) => {
        const index = Number(element.dataset.wordIndex);
        return index >= fromIndex && index <= toIndex;
      })
      .map((element) => element.textContent ?? "")
      .join(" ");
    const normalizedSelection = normalizeExplainText(selection.toString());

    selection.removeAllRanges();

    if (!normalizedSelection) {
      onSelectionNotice("selection_invalid");
      return;
    }

    const validation = validateExplainSelection({
      mode: "phrase",
      selectedText: selectedWords,
      sentenceText,
    });

    if (!validation.ok) {
      onSelectionNotice(
        validation.reason === "too_long"
          ? "selection_too_long"
          : "selection_invalid",
      );
      return;
    }

    onExplainRequest({
      mode: "phrase",
      sentenceId,
      sentenceText,
      selectedText: validation.selectedText,
    });
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>{article.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {uiCopy.reader.articleBody.currentParagraph(
            activeParagraphId ?? article.paragraphs[0]?.id,
            totalParagraphCount,
          )}
        </p>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {isMobile
            ? uiCopy.reader.articleBody.mobileExplainHint
            : uiCopy.reader.articleBody.desktopExplainHint}
        </p>
      </header>

      <div style={{ display: "grid", gap: 16 }}>
        {article.paragraphs.map((paragraph, index) => {
          const isActive = activeParagraphId === paragraph.id;

          return (
            <article
              key={paragraph.id}
              style={{
                padding: 20,
                borderRadius: 22,
                border: isActive
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
                background: isActive ? "#fff8ee" : "var(--surface)",
                opacity: isActive ? 1 : 0.45,
                transition: "opacity 0.15s ease",
              }}
            >
              <strong style={{ display: "block", marginBottom: 12 }}>
                {uiCopy.reader.articleBody.paragraphTitle(index + 1)}
              </strong>

              <div style={{ display: "grid", gap: 12 }}>
                {paragraph.sentences.map((sentence) => (
                  <p
                    key={sentence.id}
                    onMouseUp={handleSelectionEnd}
                    onTouchEnd={handleSelectionEnd}
                    style={{ margin: 0, lineHeight: 1.8, fontSize: 18 }}
                  >
                    {(() => {
                      let wordIndex = -1;

                      return tokenizeSentence(sentence.text).map(
                        (token, tokenIndex) => {
                        const normalizedToken = normalizeToken(token);
                        const isWord = /^[A-Za-z']+$/.test(token);
                        const canTapWord = isActive && isWord;
                        const isPriorityWord =
                          lookupableWords.has(normalizedToken);

                        if (isWord) {
                          wordIndex += 1;
                        }

                        if (!canTapWord) {
                          return (
                            <span
                              key={`${sentence.id}-${tokenIndex}`}
                              data-reader-word={isWord ? "true" : undefined}
                              data-sentence-id={isWord ? sentence.id : undefined}
                              data-sentence-text={isWord ? sentence.text : undefined}
                              data-word-index={
                                isWord ? String(wordIndex) : undefined
                              }
                              data-token-index={String(tokenIndex)}
                            >
                              {token}
                            </span>
                          );
                        }

                        return (
                          <button
                            key={`${sentence.id}-${tokenIndex}`}
                            type="button"
                            onClick={() =>
                              onExplainRequest({
                                mode: "word",
                                sentenceId: sentence.id,
                                sentenceText: sentence.text,
                                selectedText: token,
                              })
                            }
                            onTouchStart={() =>
                              handleWordTouchStart({
                                sentenceId: sentence.id,
                                sentenceText: sentence.text,
                                selectedText: token,
                              })
                            }
                            onTouchEnd={handleWordTouchEnd}
                            onTouchCancel={handleWordTouchEnd}
                            style={{
                              border: "none",
                              padding: 0,
                              background: "transparent",
                              color: isPriorityWord
                                ? "var(--accent)"
                                : "var(--foreground)",
                              cursor: "pointer",
                              font: "inherit",
                              textDecoration: isPriorityWord
                                ? "underline"
                                : "none",
                              textUnderlineOffset: isPriorityWord ? 3 : undefined,
                              borderRadius: 6,
                            }}
                            data-reader-word="true"
                            data-sentence-id={sentence.id}
                            data-sentence-text={sentence.text}
                            data-word-index={String(wordIndex)}
                            data-token-index={String(tokenIndex)}
                          >
                            {token}
                          </button>
                        );
                      });
                    })()}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {uiCopy.reader.articleBody.positionSaved}
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          {canGoPrevious ? (
            <button
              type="button"
              onClick={onPreviousParagraph}
              style={{
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--foreground)",
                padding: "14px 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {uiCopy.reader.articleBody.previousParagraph}
            </button>
          ) : null}

          {canGoNext ? (
            <button
              type="button"
              onClick={onNextParagraph}
              style={{
                borderRadius: 999,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                padding: "14px 20px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {uiCopy.reader.articleBody.nextParagraph}
            </button>
          ) : (
            <button
              type="button"
              onClick={onContinueToReview}
              style={{
                borderRadius: 999,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                padding: "14px 20px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {uiCopy.reader.articleBody.continueToReview}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
