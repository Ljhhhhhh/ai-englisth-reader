import type { Article } from '@/lib/content/article-schema';

const QUIZ_ATTEMPTS_KEY = 'ai-english-read-quiz-attempts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type QuizResultItem = {
  choices: string[];
  correctIndex: number;
  explanation: string;
  id: string;
  isCorrect: boolean;
  question: string;
  selectedIndex: number;
};

export type QuizAttemptRecord = {
  answers: number[];
  articleSlug: string;
  deviceId: string;
  items: QuizResultItem[];
  reviewUnlocked: boolean;
  score: number;
  submittedAt: number;
};

function createAttemptKey(deviceId: string, articleSlug: string) {
  return `${deviceId}:${articleSlug}`;
}

function readAttemptMap(storage: StorageLike) {
  const raw = storage.getItem(QUIZ_ATTEMPTS_KEY);
  if (!raw) {
    return {} as Record<string, QuizAttemptRecord>;
  }

  try {
    return JSON.parse(raw) as Record<string, QuizAttemptRecord>;
  } catch {
    return {} as Record<string, QuizAttemptRecord>;
  }
}

function writeAttemptMap(
  storage: StorageLike,
  attemptMap: Record<string, QuizAttemptRecord>,
) {
  storage.setItem(QUIZ_ATTEMPTS_KEY, JSON.stringify(attemptMap));
}

export function evaluateQuiz(article: Article, answers: number[]) {
  const items = article.quiz.map((item, index) => ({
    choices: item.choices,
    correctIndex: item.correctIndex,
    explanation: item.explanation,
    id: item.id,
    isCorrect: answers[index] === item.correctIndex,
    question: item.question,
    selectedIndex: answers[index] ?? -1,
  }));
  const score = items.filter((item) => item.isCorrect).length;

  return {
    items,
    reviewUnlocked: items.every((item) => item.selectedIndex >= 0),
    score,
  };
}

export function submitQuizForArticle(input: {
  answers: number[];
  article: Article;
  deviceId: string;
  storage?: StorageLike;
}) {
  const result = evaluateQuiz(input.article, input.answers);
  const attempt: QuizAttemptRecord = {
    answers: input.answers,
    articleSlug: input.article.slug,
    deviceId: input.deviceId,
    items: result.items,
    reviewUnlocked: result.reviewUnlocked,
    score: result.score,
    submittedAt: Date.now(),
  };

  if (input.storage) {
    const attemptMap = readAttemptMap(input.storage);
    attemptMap[createAttemptKey(input.deviceId, input.article.slug)] = attempt;
    writeAttemptMap(input.storage, attemptMap);
  }

  return attempt;
}

export function loadQuizAttempt(
  deviceId: string,
  articleSlug: string,
  storage: StorageLike,
) {
  const attemptMap = readAttemptMap(storage);
  return attemptMap[createAttemptKey(deviceId, articleSlug)] ?? null;
}
