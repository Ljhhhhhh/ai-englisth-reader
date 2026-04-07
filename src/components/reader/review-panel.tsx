import Link from 'next/link';
import type { SavedWordRecord } from '@/features/words/saved-word-service';
import type { Article } from '@/lib/content/article-schema';
import type { QuizAttemptRecord } from '@/features/quiz/quiz-service';

type ReviewPanelProps = {
  article: Article;
  quizAttempt: QuizAttemptRecord | null;
  reviewUnlocked: boolean;
  savedWords: SavedWordRecord[];
};

export function ReviewPanel({
  article,
  quizAttempt,
  reviewUnlocked,
  savedWords,
}: ReviewPanelProps) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
          Review and retain
        </p>
        <h1 style={{ margin: 0 }}>Article completed on this device.</h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {article.summary}
        </p>
      </div>

      <div style={{ padding: 18, borderRadius: 20, background: '#fff8ee' }}>
        <strong>Quiz result</strong>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {quizAttempt
            ? `${quizAttempt.score}/${article.quiz.length} correct.`
            : 'Submit the quiz to unlock the full review.'}
        </p>
      </div>

      <div style={{ padding: 18, borderRadius: 20, background: '#fcf6ee' }}>
        <strong>Full translation</strong>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {reviewUnlocked
            ? article.translation
            : 'Translation locked until quiz submission.'}
        </p>
      </div>

      <section style={{ display: 'grid', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <strong>Saved words from this article</strong>
          <Link
            href="/words"
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            Open saved words
          </Link>
        </div>
        {savedWords.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {savedWords.map((word) => (
              <div
                key={`${word.articleSlug}-${word.lemma}`}
                style={{ padding: 16, borderRadius: 18, background: '#fffaf2' }}
              >
                <strong>{word.surface}</strong>
                <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                  {word.meaning}
                </div>
                <p
                  style={{
                    marginBottom: 0,
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {word.sourceSentence}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            No saved words yet from this article.
          </p>
        )}
      </section>
    </section>
  );
}
