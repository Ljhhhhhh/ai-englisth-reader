import {
  loadAllArticles,
  loadArticle as loadArticleContent,
} from '@/lib/content/load-article';
import type { Article } from '@/lib/content/article-schema';
import {
  listPersistedArticles,
  loadPersistedArticle,
} from '@/features/articles/article-repository';

function shouldUseFileBackedArticles() {
  return process.env.NODE_ENV === 'test';
}

function shouldUseFileBackedArticles() {
  return process.env.NODE_ENV === 'test' || process.env.USE_FILE_ARTICLES === '1';
}

function shouldAllowFileFallback() {
  return process.env.NODE_ENV !== 'production';
}

async function withDevelopmentFileFallback<T>(
  loadPersisted: () => Promise<T>,
  loadFileBacked: () => Promise<T>,
) {
  if (shouldUseFileBackedArticles()) {
    return loadFileBacked();
  }

  try {
    return await loadPersisted();
  } catch (error) {
    if (!shouldAllowFileFallback()) {
      throw error;
    }

    return loadFileBacked();
  }
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
