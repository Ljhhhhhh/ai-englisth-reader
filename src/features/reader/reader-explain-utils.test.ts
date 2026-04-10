import {
  buildExplainCacheKey,
  validateExplainSelection,
} from './reader-explain-utils';

describe('reader-explain-utils', () => {
  it('accepts a single lookupable word selection', () => {
    expect(
      validateExplainSelection({
        mode: 'word',
        selectedText: 'guided',
        sentenceText:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      }),
    ).toEqual({
      ok: true,
      selectedText: 'guided',
      wordCount: 1,
    });
  });

  it('accepts a short adjacent phrase inside the sentence', () => {
    expect(
      validateExplainSelection({
        mode: 'phrase',
        selectedText: 'clear support',
        sentenceText:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      }),
    ).toEqual({
      ok: true,
      selectedText: 'clear support',
      wordCount: 2,
    });
  });

  it('rejects phrase selections that are too long', () => {
    expect(
      validateExplainSelection({
        mode: 'phrase',
        selectedText: 'the reader can follow the main idea with less',
        sentenceText:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      }),
    ).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });

  it('rejects non-english selections', () => {
    expect(
      validateExplainSelection({
        mode: 'phrase',
        selectedText: '阅读 flow',
        sentenceText:
          'When the reading flow feels steady rather than broken, deep reading becomes easier to continue.',
      }),
    ).toEqual({
      ok: false,
      reason: 'non_english',
    });
  });

  it('rejects selections that are not a contiguous part of the sentence', () => {
    expect(
      validateExplainSelection({
        mode: 'phrase',
        selectedText: 'reader focus',
        sentenceText:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      }),
    ).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });

  it('builds a stable cache key for repeated requests', () => {
    expect(
      buildExplainCacheKey({
        mode: 'phrase',
        sentenceId: 's3',
        selectedText: ' Clear   Support ',
      }),
    ).toBe('phrase:s3:clear support');
  });
});
