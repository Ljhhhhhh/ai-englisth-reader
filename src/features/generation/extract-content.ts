import { Buffer } from 'node:buffer';
import path from 'node:path';
import * as cheerio from 'cheerio';
import mammoth from 'mammoth';

export type ExtractContentInput =
  | { type: 'url'; url: string }
  | { type: 'file'; file: File };

export type ExtractedContent = {
  source: string;
  text: string;
  titleHint: string;
};

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fileNameToTitle(name: string) {
  return path.basename(name, path.extname(name)).replace(/[-_]+/g, ' ').trim();
}

async function extractFromUrl(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Lexora/0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL content: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();

  const titleHint =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    new URL(url).hostname;
  const text =
    $('article').first().text().trim() ||
    $('main').first().text().trim() ||
    $('body').text().trim();

  return {
    source: url,
    text: normalizeExtractedText(text.replace(/\s+/g, ' ')),
    titleHint,
  };
}

async function extractFromFile(file: File): Promise<ExtractedContent> {
  const extension = path.extname(file.name).toLowerCase();
  const titleHint = fileNameToTitle(file.name) || 'Generated Reading';

  if (extension === '.doc') {
    throw new Error('当前仅支持 .docx，不支持旧版 .doc 文件。');
  }

  if (extension === '.docx') {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });

    return {
      source: file.name,
      text: normalizeExtractedText(result.value),
      titleHint,
    };
  }

  if (extension === '.md' || extension === '.txt') {
    return {
      source: file.name,
      text: normalizeExtractedText(await file.text()),
      titleHint,
    };
  }

  throw new Error('当前仅支持 URL、.md、.txt、.docx。');
}

export async function extractContent(input: ExtractContentInput) {
  return input.type === 'url'
    ? extractFromUrl(input.url)
    : extractFromFile(input.file);
}
