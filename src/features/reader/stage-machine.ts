export const readerStages = ['intro', 'read', 'quiz', 'review'] as const;

export type ReaderStage = (typeof readerStages)[number];
export type CompletionState = 'in-progress' | 'completed';

type CompletionInput = {
  currentStage: ReaderStage;
  quizSubmitted: boolean;
};

export function normalizeStage(stage: string | undefined): ReaderStage {
  if (readerStages.includes(stage as ReaderStage)) {
    return stage as ReaderStage;
  }

  return 'intro';
}

export function getStageIndex(stage: ReaderStage) {
  return readerStages.indexOf(stage);
}

export function getNextStage(stage: ReaderStage): ReaderStage {
  const currentIndex = getStageIndex(stage);
  return readerStages[Math.min(currentIndex + 1, readerStages.length - 1)];
}

export function getPreviousStage(stage: ReaderStage): ReaderStage {
  const currentIndex = getStageIndex(stage);
  return readerStages[Math.max(currentIndex - 1, 0)];
}

export function getStageLabel(stage: ReaderStage) {
  switch (stage) {
    case 'intro':
      return 'Intro';
    case 'read':
      return 'Read';
    case 'quiz':
      return 'Quiz';
    case 'review':
      return 'Review';
  }
}

export function getCompletionState({
  currentStage,
  quizSubmitted,
}: CompletionInput): CompletionState {
  if (currentStage === 'review' && quizSubmitted) {
    return 'completed';
  }

  return 'in-progress';
}

export function getStageProgress(stage: ReaderStage) {
  return ((getStageIndex(stage) + 1) / readerStages.length) * 100;
}
