import {
  getCompletionState,
  getNextStage,
  getPreviousStage,
  getStageProgress,
  normalizeStage,
} from './stage-machine';

describe('stage-machine', () => {
  it('marks an article complete only when the explicit completion flag is set', () => {
    expect(
      getCompletionState({
        currentStage: 'read',
        isCompleted: true,
      }),
    ).toBe('completed');

    expect(
      getCompletionState({
        currentStage: 'read',
        isCompleted: false,
      }),
    ).toBe('in-progress');
  });

  it('moves forward and backward through the three reader stages', () => {
    expect(getNextStage('intro')).toBe('read');
    expect(getNextStage('read')).toBe('review');
    expect(getNextStage('review')).toBe('review');
    expect(getPreviousStage('review')).toBe('read');
    expect(getPreviousStage('read')).toBe('intro');
    expect(getPreviousStage('intro')).toBe('intro');
  });

  it('normalizes stage values and exposes progress percentages', () => {
    expect(normalizeStage('unknown')).toBe('intro');
    expect(getStageProgress('review')).toBe(100);
  });
});
