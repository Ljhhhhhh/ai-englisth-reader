import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearGenerateJobDebugRecord,
  getGenerateJobDebugRecord,
  setGenerateJobDebugRecord,
} from './debug-store';
import type { LlmDebugRecord } from './debug-types';

function createRecord(id: string): LlmDebugRecord {
  return {
    callId: id,
    error: null,
    meta: {
      durationMs: 120,
    },
    rawOutput: {
      available: true,
      preview: '{"ok":true}',
      truncated: false,
    },
    status: 'success',
    structuredResult: {
      data: { ok: true },
      status: 'success',
    },
    summary: {
      callType: 'generate',
      model: 'test-model',
      trigger: 'generate_page',
    },
    timestamp: '2026-04-14T00:00:00.000Z',
  };
}

describe('debug-store', () => {
  beforeEach(() => {
    clearGenerateJobDebugRecord({ jobId: 'job-1', userId: 'user-1' });
  });

  it('stores and retrieves the latest generate debug record per user and job', () => {
    setGenerateJobDebugRecord({
      jobId: 'job-1',
      record: createRecord('call-1'),
      userId: 'user-1',
    });

    expect(
      getGenerateJobDebugRecord({ jobId: 'job-1', userId: 'user-1' }),
    ).toMatchObject({
      callId: 'call-1',
    });
  });

  it('replaces an earlier record with the latest one for the same job key', () => {
    setGenerateJobDebugRecord({
      jobId: 'job-1',
      record: createRecord('call-1'),
      userId: 'user-1',
    });
    setGenerateJobDebugRecord({
      jobId: 'job-1',
      record: createRecord('call-2'),
      userId: 'user-1',
    });

    expect(
      getGenerateJobDebugRecord({ jobId: 'job-1', userId: 'user-1' }),
    ).toMatchObject({
      callId: 'call-2',
    });
  });

  it('isolates records by user', () => {
    setGenerateJobDebugRecord({
      jobId: 'job-1',
      record: createRecord('call-1'),
      userId: 'user-1',
    });

    expect(
      getGenerateJobDebugRecord({ jobId: 'job-1', userId: 'user-2' }),
    ).toBeNull();
  });
});
