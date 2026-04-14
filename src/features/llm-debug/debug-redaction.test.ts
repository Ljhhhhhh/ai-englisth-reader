import { describe, expect, it } from 'vitest';
import {
  sanitizeDebugRawPreview,
  sanitizeDebugStructuredData,
} from './debug-redaction';

describe('debug redaction', () => {
  it('redacts generate structured payloads before they reach the browser panel', () => {
    const input = {
      chinese_title: '大脑如何学习新语言',
      list_summary_zh: '一段精读摘要',
      growth_vocabulary: [{ word: 'clarify' }, { word: 'retain' }],
      high_frequency_phrases: [{ phrase: 'in practice' }],
      language_evolution: {
        explanation: 'exp',
        imitation_example: 'example',
        rewritten_sentence: 'sentence',
        target_structure: 'target',
      },
      feynman_summary:
        'This is the generated article body that must stay out of the debug panel.',
      chinese_translation: '这是一整段生成译文，不应该直接出现在调试面板。',
      paragraph_translations: ['第一段译文', '第二段译文'],
    };

    const result = sanitizeDebugStructuredData({
      callType: 'generate',
      value: input,
    }) as Record<string, unknown>;

    expect(result.redacted).toBe(true);
    expect(result.chinese_title).toMatch(/\[redacted generated title,/);
    expect(result.list_summary_zh).toMatch(/\[redacted generated summary,/);
    expect(result.feynman_summary).toMatch(/\[redacted generated article body,/);
    expect(result.chinese_translation).toMatch(
      /\[redacted generated translation,/,
    );
    expect(result.growth_vocabulary_count).toBe(2);
    expect(result.high_frequency_phrases_count).toBe(1);
    expect(result.paragraph_translation_count).toBe(2);
    expect(result.language_evolution_fields).toEqual([
      'explanation',
      'imitation_example',
      'rewritten_sentence',
      'target_structure',
    ]);
  });

  it('replaces generate raw previews with a redacted summary', () => {
    const preview = sanitizeDebugRawPreview({
      callType: 'generate',
      parsed: {
        chinese_title: '标题',
        list_summary_zh: '摘要',
        growth_vocabulary: [],
        high_frequency_phrases: [],
        language_evolution: {},
        feynman_summary: 'Full generated article body.',
        chinese_translation: '完整译文。',
        paragraph_translations: ['段落译文'],
      },
      rawPreview:
        '{"feynman_summary":"Full generated article body.","chinese_translation":"完整译文。"}',
    });

    expect(preview).toContain('[redacted generated article body');
    expect(preview).not.toContain('Full generated article body.');
    expect(preview).not.toContain('完整译文。');
  });

  it('keeps non-generate debug payloads intact', () => {
    expect(
      sanitizeDebugStructuredData({
        callType: 'word',
        value: { meaning: '清晰的' },
      }),
    ).toEqual({ meaning: '清晰的' });

    expect(
      sanitizeDebugRawPreview({
        callType: 'phrase',
        parsed: null,
        rawPreview: '{"meaning":"而不是"}',
      }),
    ).toBe('{"meaning":"而不是"}');
  });
});
