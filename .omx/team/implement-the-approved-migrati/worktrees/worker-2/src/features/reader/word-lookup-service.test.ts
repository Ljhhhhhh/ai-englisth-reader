import { loadArticle } from '@/features/articles/article-service';
import { lookupWordFromArticle } from './word-lookup-service';

describe('word-lookup-service', () => {
  it('returns prompt-aligned vocabulary data and source sentence in one lookup', async () => {
    const article = await loadArticle('welcome-to-deep-reading');
    const result = lookupWordFromArticle({
      article,
      surface: 'guided',
      sentenceId: 's3',
    });

    expect(result).toMatchObject({
      articleSlug: 'welcome-to-deep-reading',
      lemma: expect.any(String),
      chineseMeaning: expect.any(String),
      contextMeaning: expect.any(String),
      memoryHook: expect.any(String),
      memoryType: expect.any(String),
      sourceSentence: expect.stringContaining('Guided'),
      surface: expect.any(String),
    });
  });
});
