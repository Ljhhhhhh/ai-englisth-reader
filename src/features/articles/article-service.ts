import { loadAllArticles, loadArticle as loadArticleContent } from "@/lib/content/load-article";

export async function listArticles() {
  return loadAllArticles();
}

export async function loadArticle(slug: string) {
  return loadArticleContent(slug);
}
