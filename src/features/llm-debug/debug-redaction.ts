import type { LlmDebugCallType } from './debug-types';

function trimValue(value: string) {
  return value.trim();
}

export function sanitizeSourceRefLabel(input: {
  sourceRef: string;
  sourceType: 'url' | 'file';
}) {
  const sourceRef = trimValue(input.sourceRef);

  if (!sourceRef) {
    return '';
  }

  if (input.sourceType === 'file') {
    return sourceRef.split(/[/\\]/).at(-1) ?? sourceRef;
  }

  try {
    const url = new URL(sourceRef);
    const normalizedPath = url.pathname.replace(/\/+$/, '');
    const pathTail = normalizedPath.split('/').filter(Boolean).at(-1);

    if (!pathTail) {
      return url.hostname;
    }

    return `${url.hostname}/.../${pathTail}`;
  } catch {
    return sourceRef.replace(/\?.*$/, '').slice(0, 120);
  }
}

function summarizeText(label: string, value: unknown) {
  if (typeof value !== 'string') {
    return `[redacted ${label}]`;
  }

  return `[redacted ${label}, ${value.trim().length} chars]`;
}

function summarizeCount(label: string, value: unknown) {
  return Array.isArray(value) ? value.length : `[missing ${label}]`;
}

export function sanitizeDebugStructuredData(input: {
  callType: LlmDebugCallType;
  value: unknown;
}) {
  if (input.callType !== 'generate' || input.value == null) {
    return input.value;
  }

  if (typeof input.value !== 'object') {
    return {
      redacted: true,
      reason: 'Generate debug output is summarized in the browser panel.',
    };
  }

  const value = input.value as Record<string, unknown>;

  return {
    chinese_title: summarizeText('generated title', value.chinese_title),
    chinese_translation: summarizeText(
      'generated translation',
      value.chinese_translation,
    ),
    feynman_summary: summarizeText(
      'generated article body',
      value.feynman_summary,
    ),
    growth_vocabulary_count: summarizeCount(
      'growth vocabulary',
      value.growth_vocabulary,
    ),
    high_frequency_phrases_count: summarizeCount(
      'high frequency phrases',
      value.high_frequency_phrases,
    ),
    language_evolution_fields:
      value.language_evolution &&
      typeof value.language_evolution === 'object'
        ? Object.keys(value.language_evolution as Record<string, unknown>)
        : [],
    list_summary_zh: summarizeText('generated summary', value.list_summary_zh),
    paragraph_translation_count: summarizeCount(
      'paragraph translations',
      value.paragraph_translations,
    ),
    redacted: true,
  };
}

export function sanitizeDebugRawPreview(input: {
  callType: LlmDebugCallType;
  parsed: unknown;
  rawPreview: string | null;
}) {
  if (input.callType !== 'generate' || input.rawPreview == null) {
    return input.rawPreview;
  }

  const structuredSummary = sanitizeDebugStructuredData({
    callType: input.callType,
    value: input.parsed,
  });

  return JSON.stringify(
    structuredSummary ?? {
      rawLength: input.rawPreview.length,
      redacted: true,
      reason: 'Generate raw output is hidden because it may contain full article text.',
    },
    null,
    2,
  );
}
