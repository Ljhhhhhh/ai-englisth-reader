import { loadAllArticles, loadArticle as loadArticleContent } from '@/lib/content/load-article';
import type { Article } from '@/lib/content/article-schema';

function shouldUseFileBackedArticles() {
  return process.env.NODE_ENV === 'test';
}

export async function listArticles(): Promise<Article[]> {
  if (shouldUseFileBackedArticles()) {
    return loadAllArticles();
  }

  const { listPersistedArticles } = await import(
    '@/features/articles/article-repository'
  );
  return listPersistedArticles();
}

export async function loadArticle(slug: string): Promise<Article> {
  if (shouldUseFileBackedArticles()) {
    return loadArticleContent(slug);
  }

  const { loadPersistedArticle } = await import(
    '@/features/articles/article-repository'
  );
  return loadPersistedArticle(slug);
}
