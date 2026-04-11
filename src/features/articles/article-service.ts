import {
  loadAllArticles,
  loadArticle as loadArticleContent,
} from '@/lib/content/load-article';
import type { Article } from '@/lib/content/article-schema';

function shouldUseFileBackedArticles() {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.FILE_BACKED_ARTICLES === '1'
  );
}

async function loadArticleRepository() {
  return import('@/features/articles/article-repository');
}

export async function listArticles(): Promise<Article[]> {
  if (shouldUseFileBackedArticles()) {
    return loadAllArticles();
  }

  const { listPersistedArticles } = await loadArticleRepository();
  return listPersistedArticles();
}

export async function loadArticle(slug: string): Promise<Article> {
  if (shouldUseFileBackedArticles()) {
    return loadArticleContent(slug);
  }

  const { loadPersistedArticle } = await loadArticleRepository();
  return loadPersistedArticle(slug);
}
