import {
  getCompletionState,
  getNextStage,
  getPreviousStage,
  getStageProgress,
  normalizeStage,
} from './stage-machine';

describe('stage-machine', () => {
  it('marks an article complete once the reader reaches review', () => {
    expect(
      getCompletionState({
        currentStage: 'review',
      }),
    ).toBe('completed');

    expect(
      getCompletionState({
        currentStage: 'read',
      }),
    ).toBe('in-progress');
  });

  it('moves forward and backward through the three reader stages', () => {
    expect(getNextStage('intro')).toBe('read');
    expect(getNextStage('read')).toBe('review');
    expect(getPreviousStage('review')).toBe('read');
    expect(getPreviousStage('intro')).toBe('intro');
  });

  it('normalizes stage values and exposes progress percentages', () => {
    expect(normalizeStage('unknown')).toBe('intro');
    expect(getStageProgress('review')).toBe(100);
  });
});
