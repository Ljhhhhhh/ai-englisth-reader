import { loadAllArticles, loadArticle as loadArticleContent } from '@/lib/content/load-article';
import type { Article } from '@/lib/content/article-schema';
import {
  listPersistedArticles,
  loadPersistedArticle,
} from '@/features/articles/article-repository';

function shouldUseFileBackedArticles() {
  return process.env.NODE_ENV === 'test';
}

export async function listArticles(): Promise<Article[]> {
  if (shouldUseFileBackedArticles()) {
    return loadAllArticles();
  }

  return listPersistedArticles();
}

export async function loadArticle(slug: string): Promise<Article> {
  if (shouldUseFileBackedArticles()) {
    return loadArticleContent(slug);
  }

  return loadPersistedArticle(slug);
}
