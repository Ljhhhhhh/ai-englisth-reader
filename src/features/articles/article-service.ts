import { loadAllArticles, loadArticle as loadArticleContent } from '@/lib/content/load-article';
import type { Article } from '@/lib/content/article-schema';

export async function listArticles(): Promise<Article[]> {
  return loadAllArticles();
}

export async function loadArticle(slug: string): Promise<Article> {
  return loadArticleContent(slug);
}
