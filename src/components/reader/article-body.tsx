import type { Article } from "@/lib/content/article-schema";
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
  onContinueToReview: () => void;
  onPreviousParagraph: () => void;
  onNextParagraph: () => void;
  onLookupWord: (input: { sentenceId: string; surface: string }) => void;
};

export function ArticleBody({
  activeParagraphId,
  totalParagraphCount,
  article,
  lookupableWords,
  canGoPrevious,
  canGoNext,
  onContinueToReview,
  onPreviousParagraph,
  onNextParagraph,
  onLookupWord,
}: ArticleBodyProps) {
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
                    style={{ margin: 0, lineHeight: 1.8, fontSize: 18 }}
                  >
                    {tokenizeSentence(sentence.text).map(
                      (token, tokenIndex) => {
                        const normalizedToken = normalizeToken(token);
                        const canLookup =
                          isActive && lookupableWords.has(normalizedToken);

                        if (!canLookup) {
                          return (
                            <span key={`${sentence.id}-${tokenIndex}`}>
                              {token}
                            </span>
                          );
                        }

                        return (
                          <button
                            key={`${sentence.id}-${tokenIndex}`}
                            type="button"
                            onClick={() =>
                              onLookupWord({
                                sentenceId: sentence.id,
                                surface: token,
                              })
                            }
                            style={{
                              border: "none",
                              padding: 0,
                              background: "transparent",
                              color: "var(--accent)",
                              cursor: "pointer",
                              font: "inherit",
                              textDecoration: "underline",
                              textUnderlineOffset: 3,
                            }}
                          >
                            {token}
                          </button>
                        );
                      },
                    )}
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
