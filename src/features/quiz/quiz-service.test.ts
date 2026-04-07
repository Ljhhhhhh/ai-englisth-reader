import { loadArticle } from '@/features/articles/article-service';
import { submitQuizForArticle } from './quiz-service';

describe('quiz-service', () => {
  it('returns explanations and unlocks translation after submission', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const result = submitQuizForArticle({
      answers: [1, 0, 2],
      article,
      deviceId: 'dev-1',
    });

    expect(result.items.every((item) => item.explanation.length > 0)).toBe(
      true,
    );
    expect(result.reviewUnlocked).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
