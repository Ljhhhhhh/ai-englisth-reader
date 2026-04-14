import { describe, expect, it } from 'vitest';

import { renderStreamingStageDraft } from './streaming-stage-render';

describe('renderStreamingStageDraft', () => {
  it('keeps english draft paragraphs readable', () => {
    expect(
      renderStreamingStageDraft(
        'english',
        ' First paragraph.\n\nSecond paragraph.  ',
      ),
    ).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('normalizes vocabulary draft fragments without collapsing line intent', () => {
    expect(
      renderStreamingStageDraft(
        'vocabulary',
        ' word: retain \n meaning: 保留 \n\n phrase: in context ',
      ),
    ).toBe('word: retain\nmeaning: 保留\n\nphrase: in context');
  });

  it('preserves grammar prose while trimming noise', () => {
    expect(
      renderStreamingStageDraft(
        'grammar',
        '\n  This sentence uses a when-clause to show timing.   ',
      ),
    ).toBe('This sentence uses a when-clause to show timing.');
  });

  it('keeps translation title and body blocks distinct', () => {
    expect(
      renderStreamingStageDraft(
        'translation',
        '中文标题：在语境中记忆\n\n第一段译文。',
      ),
    ).toBe('中文标题：在语境中记忆\n\n第一段译文。');
  });
});
