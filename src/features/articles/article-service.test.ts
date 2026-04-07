import { listArticles, loadArticle } from "./article-service";

describe("article-service", () => {
  it("loads a complete article for the reading flow", async () => {
    const article = await loadArticle("welcome-to-deep-reading");

    expect(article.slug).toBe("welcome-to-deep-reading");
    expect(article.vocabulary).toHaveLength(5);
    expect(article.quiz.length).toBeGreaterThanOrEqual(3);
  });

  it("lists available articles for the homepage", async () => {
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
