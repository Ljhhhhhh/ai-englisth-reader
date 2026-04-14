import { describe, expect, it } from 'vitest';

import { buildFinalArticle } from './build-final-article';

describe('buildFinalArticle', () => {
  it('assembles the final article from stage outputs using the reserved slug', () => {
    const article = buildFinalArticle({
      canonicalSource: 'https://example.com/article',
      canonicalTitleHint: 'Article Title',
      english: {
        feynman_summary:
          'Systems fail when teams optimize pieces in isolation.\n\nReliable software treats the whole service as one coordinated system.',
      },
      grammar: {
        language_evolution: {
          explanation: '使用 when 引导时间状语从句。',
          imitation_example: 'When pressure rises, the team slows down on purpose.',
          rewritten_sentence:
            'Systems fail when teams optimize pieces in isolation.',
          target_structure: 'when 引导时间状语从句',
        },
      },
      reservedArticleSlug: 'article-title-job-1',
      translation: {
        chinese_title: '系统必须协同',
        chinese_translation: '当团队各自优化局部时，系统会失灵。\n\n可靠的软件会把整个服务当作一个协调系统。',
        list_summary_zh: '讲为什么系统要整体协同。',
        paragraph_translations: [
          '当团队各自优化局部时，系统会失灵。',
          '可靠的软件会把整个服务当作一个协调系统。',
        ],
      },
      vocabulary: {
        growth_vocabulary: [
          {
            chinese_meaning: '孤立地',
            context_meaning: '彼此分开地',
            memory_hook: 'isolated pieces',
            memory_type: '场景助记',
            word: 'isolation',
          },
          {
            chinese_meaning: '协调',
            context_meaning: '把部分配合起来',
            memory_hook: 'coordinate a whole',
            memory_type: '场景助记',
            word: 'coordinated',
          },
          {
            chinese_meaning: '优化',
            context_meaning: '改进表现',
            memory_hook: 'optimize one part',
            memory_type: '搭配助记',
            word: 'optimize',
          },
          {
            chinese_meaning: '可靠的',
            context_meaning: '能够稳定工作的',
            memory_hook: 'reliable software',
            memory_type: '搭配助记',
            word: 'reliable',
          },
        ],
        high_frequency_phrases: [
          {
            chinese_meaning: '当作',
            phrase: 'treat as',
            usage_note: 'useful for framing interpretation',
          },
          {
            chinese_meaning: '整体系统',
            phrase: 'whole service',
            usage_note: 'useful for systems discussion',
          },
        ],
      },
    });

    expect(article).toMatchObject({
      chinese_title: '系统必须协同',
      difficulty: 'B1',
      estimatedMinutes: 4,
      list_summary_zh: '讲为什么系统要整体协同。',
      slug: 'article-title-job-1',
      source: 'https://example.com/article',
      title: 'Article Title',
    });
    expect(article.paragraphs).toHaveLength(2);
    expect(article.paragraphs[0]?.translation).toBe(
      '当团队各自优化局部时，系统会失灵。',
    );
    expect(article.language_evolution.rewritten_sentence).toBe(
      'Systems fail when teams optimize pieces in isolation.',
    );
  });
});
