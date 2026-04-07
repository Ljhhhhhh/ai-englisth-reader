import type { Article } from '@/lib/content/article-schema';
import type { QuizAttemptRecord } from '@/features/quiz/quiz-service';

type QuizPanelProps = {
  answers: number[];
  article: Article;
  onSelectAnswer: (questionIndex: number, choiceIndex: number) => void;
  onSubmitQuiz: () => void;
  quizAttempt: QuizAttemptRecord | null;
};

export function QuizPanel({
  answers,
  article,
  onSelectAnswer,
  onSubmitQuiz,
  quizAttempt,
}: QuizPanelProps) {
  const allAnswered =
    answers.length === article.quiz.length &&
    answers.every((answer) => answer >= 0);

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
          Comprehension check
        </p>
        <h1 style={{ margin: 0 }}>
          Confirm what you understood before unlocking the review.
        </h1>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        {article.quiz.map((item, questionIndex) => {
          const resultItem = quizAttempt?.items[questionIndex];

          return (
            <article
              key={item.id}
              style={{
                display: 'grid',
                gap: 12,
                padding: 18,
                borderRadius: 20,
                background: '#fffaf2',
              }}
            >
              <strong>{item.question}</strong>
              <div style={{ display: 'grid', gap: 10 }}>
                {item.choices.map((choice, choiceIndex) => {
                  const selected = answers[questionIndex] === choiceIndex;
                  const showCorrect = resultItem?.correctIndex === choiceIndex;
                  const showIncorrect =
                    Boolean(resultItem) && selected && !resultItem?.isCorrect;

                  return (
                    <button
                      key={`${item.id}-${choiceIndex}`}
                      type="button"
                      onClick={() => onSelectAnswer(questionIndex, choiceIndex)}
                      disabled={Boolean(quizAttempt)}
                      style={{
                        textAlign: 'left',
                        borderRadius: 18,
                        border: showCorrect
                          ? '1px solid #1f6f50'
                          : showIncorrect
                            ? '1px solid #b45309'
                            : selected
                              ? '1px solid var(--accent)'
                              : '1px solid var(--border)',
                        background: showCorrect
                          ? '#eef8f2'
                          : showIncorrect
                            ? '#fff4e5'
                            : selected
                              ? '#fff1e2'
                              : '#ffffff',
                        padding: '14px 16px',
                        cursor: quizAttempt ? 'default' : 'pointer',
                      }}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>

              {resultItem ? (
                <p
                  style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}
                >
                  {resultItem.explanation}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      {quizAttempt ? (
        <div
          style={{
            padding: 18,
            borderRadius: 20,
            background: '#fcf6ee',
            color: 'var(--muted)',
          }}
        >
          Score: {quizAttempt.score}/{article.quiz.length}. Review is now
          unlocked.
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          onClick={onSubmitQuiz}
          disabled={!allAnswered || Boolean(quizAttempt)}
          style={{
            borderRadius: 999,
            border: 'none',
            background:
              !allAnswered || quizAttempt ? '#e7e5e4' : 'var(--accent)',
            color: '#fff',
            padding: '14px 20px',
            fontWeight: 700,
            cursor: !allAnswered || quizAttempt ? 'not-allowed' : 'pointer',
          }}
        >
          {quizAttempt ? 'Quiz submitted' : 'Submit quiz'}
        </button>
      </div>
    </section>
  );
}
