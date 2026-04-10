export type ReaderExplainMode = 'word' | 'phrase';

export type ReaderExplainSelectionFailureReason =
  | 'empty'
  | 'non_english'
  | 'word_count_mismatch'
  | 'too_short'
  | 'too_long'
  | 'not_found';

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function tokenizeEnglishWords(value: string) {
  return value.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) ?? [];
}

function hasContiguousWords(sentenceWords: string[], selectedWords: string[]) {
  if (!selectedWords.length || selectedWords.length > sentenceWords.length) {
    return false;
  }

  for (let index = 0; index <= sentenceWords.length - selectedWords.length; index += 1) {
    const matches = selectedWords.every(
      (word, offset) => sentenceWords[index + offset] === word,
    );

    if (matches) {
      return true;
    }
  }

  return false;
}

export function normalizeExplainText(value: string) {
  return normalizeWhitespace(value);
}

export function validateExplainSelection(input: {
  mode: ReaderExplainMode;
  selectedText: string;
  sentenceText: string;
}):
  | { ok: true; selectedText: string; wordCount: number }
  | { ok: false; reason: ReaderExplainSelectionFailureReason } {
  const normalizedSelectedText = normalizeExplainText(input.selectedText);

  if (!normalizedSelectedText) {
    return { ok: false, reason: 'empty' };
  }

  const selectedWords = tokenizeEnglishWords(normalizedSelectedText);

  if (!selectedWords.length) {
    return { ok: false, reason: 'non_english' };
  }

  if (selectedWords.join(' ').toLowerCase() !== normalizedSelectedText.toLowerCase()) {
    return { ok: false, reason: 'non_english' };
  }

  if (input.mode === 'word' && selectedWords.length !== 1) {
    return { ok: false, reason: 'word_count_mismatch' };
  }

  if (input.mode === 'phrase' && selectedWords.length < 2) {
    return { ok: false, reason: 'too_short' };
  }

  if (input.mode === 'phrase' && selectedWords.length > 6) {
    return { ok: false, reason: 'too_long' };
  }

  const sentenceWords = tokenizeEnglishWords(input.sentenceText.toLowerCase());

  if (!hasContiguousWords(sentenceWords, selectedWords.map((word) => word.toLowerCase()))) {
    return { ok: false, reason: 'not_found' };
  }

  return {
    ok: true,
    selectedText: normalizedSelectedText,
    wordCount: selectedWords.length,
  };
}

export function buildExplainCacheKey(input: {
  mode: ReaderExplainMode;
  sentenceId: string;
  selectedText: string;
}) {
  return `${input.mode}:${input.sentenceId}:${normalizeExplainText(input.selectedText).toLowerCase()}`;
}
