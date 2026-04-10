import {
  getExplainModeForWordCount,
  normalizeExplainText,
  validateExplainSelection,
} from './reader-explain-utils';

export type ReaderTokenSelection = {
  sentenceId: string;
  sentenceText: string;
  tokens: string[];
  startWordIndex: number;
  endWordIndex: number;
  selectedText: string;
};

type BuildSelectionInput = {
  sentenceId: string;
  sentenceText: string;
  tokens: string[];
  startWordIndex: number;
  endWordIndex: number;
};

function buildSelection(input: BuildSelectionInput) {
  const [startWordIndex, endWordIndex] =
    input.startWordIndex <= input.endWordIndex
      ? [input.startWordIndex, input.endWordIndex]
      : [input.endWordIndex, input.startWordIndex];

  if (
    startWordIndex < 0 ||
    endWordIndex >= input.tokens.length ||
    startWordIndex > endWordIndex
  ) {
    return null;
  }

  const selectedText = normalizeExplainText(
    input.tokens.slice(startWordIndex, endWordIndex + 1).join(' '),
  );

  if (!selectedText) {
    return null;
  }

  return {
    sentenceId: input.sentenceId,
    sentenceText: input.sentenceText,
    tokens: input.tokens,
    startWordIndex,
    endWordIndex,
    selectedText,
  } satisfies ReaderTokenSelection;
}

export function createWordSelection(input: {
  sentenceId: string;
  sentenceText: string;
  tokens: string[];
  wordIndex: number;
}) {
  return buildSelection({
    ...input,
    startWordIndex: input.wordIndex,
    endWordIndex: input.wordIndex,
  });
}

export function expandSelectionLeft(selection: ReaderTokenSelection) {
  return buildSelection({
    ...selection,
    startWordIndex: selection.startWordIndex - 1,
    endWordIndex: selection.endWordIndex,
  });
}

export function expandSelectionRight(selection: ReaderTokenSelection) {
  return buildSelection({
    ...selection,
    startWordIndex: selection.startWordIndex,
    endWordIndex: selection.endWordIndex + 1,
  });
}

export function collapseSelectionToWord(
  selection: ReaderTokenSelection,
  wordIndex: number,
) {
  if (
    wordIndex < selection.startWordIndex ||
    wordIndex > selection.endWordIndex
  ) {
    return null;
  }

  return buildSelection({
    ...selection,
    startWordIndex: wordIndex,
    endWordIndex: wordIndex,
  });
}

export function selectionToExplainText(selection: ReaderTokenSelection) {
  const selectedText = normalizeExplainText(
    selection.tokens
      .slice(selection.startWordIndex, selection.endWordIndex + 1)
      .join(' '),
  );
  const wordCount = selection.endWordIndex - selection.startWordIndex + 1;
  const validation = validateExplainSelection({
    mode: getExplainModeForWordCount(wordCount),
    selectedText,
    sentenceText: selection.sentenceText,
  });

  return validation.ok ? validation.selectedText : null;
}
