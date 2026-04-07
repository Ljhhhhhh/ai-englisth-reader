import { loadArticle } from '@/features/articles/article-service';
import { lookupWordFromArticle } from './word-lookup-service';

describe('word-lookup-service', () => {
  it('returns lemma, meaning, phonetic, and source sentence in one lookup', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const result = lookupWordFromArticle({
      article,
      surface: 'absorbed',
      sentenceId: 's3',
    });

    expect(result).toMatchObject({
      articleSlug: 'welcome-to-deep-reading',
      lemma: expect.any(String),
      meaning: expect.any(String),
      phonetic: expect.any(String),
      sourceSentence: expect.stringContaining('absorbed'),
      surface: expect.any(String),
    });
  });
});
