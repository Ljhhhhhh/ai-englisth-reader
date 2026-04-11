import { PrismaClient } from '@prisma/client';
import { loadAllArticles } from '../src/lib/content/load-article';
import { env } from '../src/lib/env';
import { createPrismaMysqlAdapter } from '../src/lib/prisma-mysql-adapter';

const prisma = new PrismaClient({
  adapter: createPrismaMysqlAdapter(env.DATABASE_URL),
});

async function main() {
  const articles = await loadAllArticles();

  for (const article of articles) {
    await prisma.article.upsert({
      create: {
        chineseTitle: article.chinese_title,
        chineseTranslation: article.chinese_translation,
        difficulty: article.difficulty,
        estimatedMinutes: article.estimatedMinutes,
        feynmanSummary: article.feynman_summary,
        growthVocabularyJson: article.growth_vocabulary,
        highFrequencyPhrasesJson: article.high_frequency_phrases,
        languageEvolutionJson: article.language_evolution,
        listSummaryZh: article.list_summary_zh,
        paragraphsJson: article.paragraphs,
        slug: article.slug,
        source: article.source,
        title: article.title,
        visibility: 'PUBLIC',
      },
      update: {
        chineseTitle: article.chinese_title,
        chineseTranslation: article.chinese_translation,
        difficulty: article.difficulty,
        estimatedMinutes: article.estimatedMinutes,
        feynmanSummary: article.feynman_summary,
        growthVocabularyJson: article.growth_vocabulary,
        highFrequencyPhrasesJson: article.high_frequency_phrases,
        languageEvolutionJson: article.language_evolution,
        listSummaryZh: article.list_summary_zh,
        paragraphsJson: article.paragraphs,
        source: article.source,
        title: article.title,
        visibility: 'PUBLIC',
      },
      where: { slug: article.slug },
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
