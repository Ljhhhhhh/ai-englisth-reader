import type { Article } from '@/lib/content/article-schema';

type ParsedParagraph = Pick<Article['paragraphs'][number], 'id' | 'sentences'>;

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function chunkSentences(sentences: string[], chunkSize: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < sentences.length; index += chunkSize) {
    chunks.push(sentences.slice(index, index + chunkSize));
  }

  return chunks;
}

export function parseFeynmanSummary(summary: string): ParsedParagraph[] {
  const trimmedSummary = summary.trim();

  if (!trimmedSummary) {
    return [];
  }

  const rawParagraphs = trimmedSummary
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const paragraphTexts =
    rawParagraphs.length > 1
      ? rawParagraphs
      : (() => {
          const sentences = splitSentences(trimmedSummary);

          if (sentences.length <= 2) {
            return [trimmedSummary];
          }

          return chunkSentences(sentences, 2).map((chunk) => chunk.join(' '));
        })();

  let sentenceIndex = 0;

  return paragraphTexts
    .map((paragraphText, paragraphIndex) => {
      const sentences = splitSentences(paragraphText).map((text) => ({
        id: `s${++sentenceIndex}`,
        text,
        notes: [],
      }));

      return {
        id: `p${paragraphIndex + 1}`,
        sentences,
      };
    })
    .filter((paragraph) => paragraph.sentences.length > 0);
}

export function splitSummaryIntoSentences(summary: string) {
  return parseFeynmanSummary(summary).flatMap((paragraph) =>
    paragraph.sentences.map((sentence) => sentence.text),
  );
}
