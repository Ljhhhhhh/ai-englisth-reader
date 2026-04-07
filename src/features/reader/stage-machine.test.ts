import {
  getCompletionState,
  getNextStage,
  getPreviousStage,
  getStageProgress,
  normalizeStage,
} from './stage-machine';

describe('stage-machine', () => {
  it('marks an article complete only after quiz submission and review access', () => {
    expect(
      getCompletionState({
        currentStage: 'review',
        quizSubmitted: true,
      }),
    ).toBe('completed');

    expect(
      getCompletionState({
        currentStage: 'review',
        quizSubmitted: false,
      }),
    ).toBe('in-progress');
  });

  it('moves forward and backward through the four reader stages', () => {
    expect(getNextStage('intro')).toBe('read');
    expect(getNextStage('quiz')).toBe('review');
    expect(getPreviousStage('review')).toBe('quiz');
    expect(getPreviousStage('intro')).toBe('intro');
  });

  it('normalizes stage values and exposes progress percentages', () => {
    expect(normalizeStage('unknown')).toBe('intro');
    expect(getStageProgress('quiz')).toBe(75);
  });
});
