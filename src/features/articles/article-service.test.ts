import { listArticles, loadArticle } from './article-service';

describe('article-service', () => {
  it('loads a complete article for the reading flow without quiz data', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    expect(article.slug).toBe('welcome-to-deep-reading');
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

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      slug: expect.any(String),
      title: expect.any(String),
      difficulty: expect.any(String),
      estimatedMinutes: expect.any(Number),
    });
  });
});
