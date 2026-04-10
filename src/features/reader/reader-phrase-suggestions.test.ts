import { loadArticle } from '@/features/articles/article-service';
import { getPhraseSuggestionsForWord } from './reader-phrase-suggestions';

describe('reader-phrase-suggestions', () => {
  it('prefers article phrase data that matches the current sentence', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    expect(
      getPhraseSuggestionsForWord({
        article,
        sentenceId: 's3',
        sentenceText:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
        selectedWord: 'panic',
      }),
    ).toEqual([
      {
        text: 'main idea',
        reason: '这句里的高频短语',
      },
      {
        text: 'less panic',
        reason: '顺手一起看更好懂',
      },
      {
        text: 'more focus',
        reason: '就在这个词附近',
      },
    ]);
  });

  it('returns short adjacent phrase fallbacks when no article phrase matches the word', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    expect(
      getPhraseSuggestionsForWord({
        article,
        sentenceId: 's1',
        sentenceText:
          'Many learners can read part of an English article but lose confidence when the meaning starts to blur.',
        selectedWord: 'confidence',
      }),
    ).toEqual([
      {
        text: 'lose confidence',
        reason: '顺手一起看更好懂',
      },
      {
        text: 'the meaning',
        reason: '就在这个词附近',
      },
      {
        text: 'meaning starts',
        reason: '就在这个词附近',
      },
    ]);
  });
});
