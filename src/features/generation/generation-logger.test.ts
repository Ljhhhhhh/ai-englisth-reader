import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('generation-logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('appends a jsonl entry to the generation log file', async () => {
    const previousCwd = process.cwd();
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lexora-generation-log-'));

    try {
      process.chdir(tempDir);

      const { appendGenerationLog, GENERATION_LOG_PATH } = await import('./generation-logger');

      await appendGenerationLog({
        event: 'stage_started',
        jobId: 'job-1',
        payload: {
          attempt: 1,
        },
        stage: 'grammar',
        userId: 'user-1',
      });

      const content = await readFile(GENERATION_LOG_PATH, 'utf8');

      expect(content).toContain('"event":"stage_started"');
      expect(content).toContain('"jobId":"job-1"');
      expect(content).toContain('"stage":"grammar"');
    } finally {
      process.chdir(previousCwd);
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});
