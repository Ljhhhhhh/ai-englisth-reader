import { listArticles, loadArticle } from './article-service';

describe('article-service', () => {
  it('loads a migrated article with bilingual metadata and paragraph translations', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    expect(article.slug).toBe('welcome-to-deep-reading');
    expect(article.title).toBe('Read English with More Ease');
    expect(article.chinese_title).toBe('更从容地读英文');
    expect(Array.from(article.list_summary_zh).length).toBeLessThanOrEqual(100);
    expect(
      article.paragraphs.every((paragraph) => paragraph.translation.trim().length > 0),
    ).toBe(true);
    expect(article.growth_vocabulary).toHaveLength(5);
    expect(article.high_frequency_phrases).toHaveLength(3);
    expect(article.language_evolution).toMatchObject({
      target_structure: expect.any(String),
      rewritten_sentence: expect.any(String),
    });
    expect('quiz' in article).toBe(false);
  });

  it('lists available articles for the homepage', async () => {
    const articles = await listArticles();

    expect(articles.length).toBeGreaterThanOrEqual(3);
    expect(articles[0]).toMatchObject({
      slug: expect.any(String),
      title: expect.any(String),
      chinese_title: expect.any(String),
      list_summary_zh: expect.any(String),
      difficulty: expect.any(String),
      estimatedMinutes: expect.any(Number),
    });
    expect(
      articles.every((article) => Array.from(article.list_summary_zh).length <= 100),
    ).toBe(true);
  });
});
