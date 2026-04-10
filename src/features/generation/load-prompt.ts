import { readFile } from 'node:fs/promises';
import path from 'node:path';

let promptCache: string | null = null;

export async function loadPrompt() {
  if (promptCache) {
    return promptCache;
  }

  const promptPath = path.join(process.cwd(), 'docs', 'prompt.md');
  const basePrompt = await readFile(promptPath, 'utf8');

  promptCache = `${basePrompt}\n\n【运行时补充要求】\n- 请以下面的最终 schema 为准，覆盖基础提示中的旧 schema。\n- title 不在输出中提供，系统会基于外部输入写入英文标题；你需要额外输出 chinese_title 作为中文标题。\n- list_summary_zh 必须是 100 字以内的中文概要，用于文章列表展示。\n- feynman_summary 必须使用 2-4 个自然段落，并用空行分隔。\n- paragraph_translations 必须与 feynman_summary 的段落数、顺序一一对应，每一项只翻译对应段落。\n- chinese_translation 仍然保留，内容应是整篇正文的忠实中文译文。\n- rewritten_sentence 必须逐字摘自 feynman_summary。\n- growth_vocabulary.word 与 high_frequency_phrases.phrase 必须直接出现在 feynman_summary 中。\n\n【最终 JSON Schema】\n{\n  "chinese_title": "string",\n  "list_summary_zh": "string (100字以内)",\n  "growth_vocabulary": [{ "...": "..." }],\n  "high_frequency_phrases": [{ "...": "..." }],\n  "language_evolution": {\n    "target_structure": "string",\n    "rewritten_sentence": "string",\n    "explanation": "string",\n    "imitation_example": "string"\n  },\n  "feynman_summary": "string",\n  "chinese_translation": "string",\n  "paragraph_translations": ["string"]\n}`;

  return promptCache;
}
