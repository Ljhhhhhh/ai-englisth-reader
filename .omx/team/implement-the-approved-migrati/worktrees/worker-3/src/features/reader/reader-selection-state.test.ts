import {
  collapseSelectionToWord,
  createWordSelection,
  expandSelectionLeft,
  expandSelectionRight,
  selectionToExplainText,
} from './reader-selection-state';

describe('reader-selection-state', () => {
  const baseInput = {
    sentenceId: 's3',
    sentenceText:
      'Guided by clear support, the reader can follow the main idea.',
    tokens: ['Guided', 'by', 'clear', 'support', 'the', 'reader'],
  };

  it('starts from a single selected word', () => {
    expect(
      createWordSelection({
        ...baseInput,
        wordIndex: 2,
      }),
    ).toEqual({
      ...baseInput,
      startWordIndex: 2,
      endWordIndex: 2,
      selectedText: 'clear',
    });
  });

  it('expands to adjacent words only', () => {
    const selection = createWordSelection({
      ...baseInput,
      wordIndex: 2,
    });

    expect(selection).not.toBeNull();
    if (!selection) {
      throw new Error('expected selection');
    }

    expect(expandSelectionRight(selection)).toEqual({
      ...baseInput,
      startWordIndex: 2,
      endWordIndex: 3,
      selectedText: 'clear support',
    });
    expect(expandSelectionLeft(selection)).toEqual({
      ...baseInput,
      startWordIndex: 1,
      endWordIndex: 2,
      selectedText: 'by clear',
    });
  });

  it('returns null when expansion would leave the sentence', () => {
    const selection = createWordSelection({
      ...baseInput,
      wordIndex: 0,
    });

    expect(selection).not.toBeNull();
    if (!selection) {
      throw new Error('expected selection');
    }

    expect(expandSelectionLeft(selection)).toBeNull();
  });

  it('can collapse a phrase back to one of its selected words', () => {
    const initialSelection = createWordSelection({
      ...baseInput,
      wordIndex: 2,
    });

    expect(initialSelection).not.toBeNull();
    if (!initialSelection) {
      throw new Error('expected initial selection');
    }

    const selection = expandSelectionRight(initialSelection);

    expect(selection).not.toBeNull();
    if (!selection) {
      throw new Error('expected expanded selection');
    }

    expect(collapseSelectionToWord(selection, 3)).toEqual({
      ...baseInput,
      startWordIndex: 3,
      endWordIndex: 3,
      selectedText: 'support',
    });
  });

  it('normalizes phrase text for explain validation', () => {
    expect(
      selectionToExplainText({
        ...baseInput,
        startWordIndex: 2,
        endWordIndex: 3,
        selectedText: 'clear support',
      }),
    ).toBe('clear support');
  });

  it('returns null when the selected range would fail explain validation', () => {
    expect(
      selectionToExplainText({
        ...baseInput,
        tokens: ['Guided', 'by', 'clear', 'support', 'the', 'reader', 'can'],
        startWordIndex: 0,
        endWordIndex: 6,
        selectedText: 'Guided by clear support the reader can',
      }),
    ).toBeNull();
  });
});
