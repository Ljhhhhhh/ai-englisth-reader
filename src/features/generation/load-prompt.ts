import { readFile } from 'node:fs/promises';
import path from 'node:path';

let promptCache: string | null = null;

export async function loadPrompt() {
  if (promptCache) {
    return promptCache;
  }

  const promptPath = path.join(process.cwd(), 'docs', 'prompt.md');
  const basePrompt = await readFile(promptPath, 'utf8');

  promptCache = `${basePrompt}\n\n【运行时补充要求】\n- feynman_summary 建议使用 2-4 个自然段落；若不分段，系统会自动切段。\n- rewritten_sentence 必须逐字摘自 feynman_summary。\n- growth_vocabulary.word 与 high_frequency_phrases.phrase 必须直接出现在 feynman_summary 中。`;

  return promptCache;
}
