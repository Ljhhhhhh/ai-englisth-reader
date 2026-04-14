import type { GenerationStageName } from '../generation-job-schema';

function normalizeLine(line: string) {
  return line.replace(/\s+/g, ' ').trim();
}

export function renderStreamingStageDraft(
  _stage: GenerationStageName,
  rawText: string,
) {
  return rawText
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => normalizeLine(line))
        .filter(Boolean)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n');
}
