import { promises as fs } from "node:fs";
import path from "node:path";
import { articleSchema, type Article } from "./article-schema";

const contentDir = path.join(process.cwd(), "content", "articles");

export async function loadArticleFile(fileName: string): Promise<Article> {
  const fullPath = path.join(contentDir, fileName);
  const raw = await fs.readFile(fullPath, "utf8");
  return articleSchema.parse(JSON.parse(raw));
}

export async function loadArticle(slug: string): Promise<Article> {
  const files = await fs.readdir(contentDir);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    const article = await loadArticleFile(file);
    if (article.slug === slug) {
      return article;
    }
  }

  throw new Error(`Article not found: ${slug}`);
}

export async function loadAllArticles(): Promise<Article[]> {
  const files = await fs.readdir(contentDir);
  const articles = await Promise.all(
    files.filter((file) => file.endsWith(".json")).map((file) => loadArticleFile(file)),
  );

  return articles.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
}
