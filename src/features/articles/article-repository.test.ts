import { describe, expect, it } from 'vitest';

import { loadArticleFile } from '@/lib/content/load-article';

import {
  mapArticleRecordToArticle,
  mapArticleToPersistenceInput,
} from './article-repository';

describe('article-repository mappers', () => {
  it('maps an article schema object into JSON-backed persistence fields', async () => {
    const article = await loadArticleFile('welcome-to-deep-reading.json');
    const persistenceInput = mapArticleToPersistenceInput(article);

    expect(persistenceInput).toMatchObject({
      chineseTitle: article.chinese_title,
      difficulty: article.difficulty,
      listSummaryZh: article.list_summary_zh,
      slug: article.slug,
      title: article.title,
      visibility: 'PUBLIC',
    });
    expect(persistenceInput.paragraphsJson).toEqual(article.paragraphs);
    expect(persistenceInput.growthVocabularyJson).toEqual(
      article.growth_vocabulary,
    );
  });

  it('maps a persisted article record back to the runtime article shape', async () => {
    const article = await loadArticleFile('welcome-to-deep-reading.json');

    const runtimeArticle = mapArticleRecordToArticle({
      chineseTitle: article.chinese_title,
      chineseTranslation: article.chinese_translation,
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
      difficulty: article.difficulty,
      estimatedMinutes: article.estimatedMinutes,
      feynmanSummary: article.feynman_summary,
      growthVocabularyJson: article.growth_vocabulary,
      highFrequencyPhrasesJson: article.high_frequency_phrases,
      id: 'article-1',
      languageEvolutionJson: article.language_evolution,
      listSummaryZh: article.list_summary_zh,
      paragraphsJson: article.paragraphs,
      slug: article.slug,
      source: article.source,
      title: article.title,
      updatedAt: new Date('2026-04-11T00:00:00.000Z'),
      visibility: 'PUBLIC',
    });

    expect(runtimeArticle).toEqual(article);
  });
});
