import { PrismaClient } from '@prisma/client';
import { loadAllArticles } from '../src/lib/content/load-article';

const prisma = new PrismaClient();

async function main() {
  const articles = await loadAllArticles();

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        source: article.source,
        difficulty: article.difficulty,
        estimatedMinutes: article.estimatedMinutes,
        feynmanSummary: article.feynman_summary,
        chineseTranslation: article.chinese_translation,
      },
      create: {
        slug: article.slug,
        title: article.title,
        source: article.source,
        difficulty: article.difficulty,
        estimatedMinutes: article.estimatedMinutes,
        feynmanSummary: article.feynman_summary,
        chineseTranslation: article.chinese_translation,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
