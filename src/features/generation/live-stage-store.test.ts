import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearAllLiveStageDrafts,
  clearLiveStageDraft,
  clearLiveStageDraftsForJob,
  getLiveStageDraft,
  listLiveStageDraftsForJob,
  setLiveStageDraft,
} from './live-stage-store';

describe('live-stage-store', () => {
  beforeEach(() => {
    clearAllLiveStageDrafts();
  });

  it('stores and retrieves a stage draft by job and stage', () => {
    const updatedAt = '2026-04-14T09:00:00.000Z';

    setLiveStageDraft({
      attempt: 1,
      jobId: 'job-1',
      stage: 'english',
      status: 'streaming',
      text: 'Draft article opening.',
      updatedAt,
    });

    expect(getLiveStageDraft('job-1', 'english')).toEqual({
      attempt: 1,
      jobId: 'job-1',
      stage: 'english',
      status: 'streaming',
      text: 'Draft article opening.',
      updatedAt,
    });
  });

  it('replaces a draft only when the next version is monotonic', () => {
    setLiveStageDraft({
      attempt: 2,
      jobId: 'job-1',
      stage: 'grammar',
      status: 'streaming',
      text: 'Draft grammar note.',
      updatedAt: '2026-04-14T09:00:02.000Z',
    });

    setLiveStageDraft({
      attempt: 1,
      jobId: 'job-1',
      stage: 'grammar',
      status: 'streaming',
      text: 'Older attempt should be ignored.',
      updatedAt: '2026-04-14T09:00:03.000Z',
    });

    setLiveStageDraft({
      attempt: 2,
      jobId: 'job-1',
      stage: 'grammar',
      status: 'streaming',
      text: 'Short',
      updatedAt: '2026-04-14T09:00:01.000Z',
    });

    setLiveStageDraft({
      attempt: 2,
      jobId: 'job-1',
      stage: 'grammar',
      status: 'streaming',
      text: 'Draft grammar note grows.',
      updatedAt: '2026-04-14T09:00:04.000Z',
    });

    expect(getLiveStageDraft('job-1', 'grammar')).toMatchObject({
      attempt: 2,
      text: 'Draft grammar note grows.',
      updatedAt: '2026-04-14T09:00:04.000Z',
    });
  });

  it('clears one draft without touching others', () => {
    setLiveStageDraft({
      attempt: 1,
      jobId: 'job-1',
      stage: 'english',
      status: 'streaming',
      text: 'English draft',
      updatedAt: '2026-04-14T09:00:00.000Z',
    });
    setLiveStageDraft({
      attempt: 1,
      jobId: 'job-1',
      stage: 'translation',
      status: 'streaming',
      text: 'Translation draft',
      updatedAt: '2026-04-14T09:00:01.000Z',
    });

    clearLiveStageDraft('job-1', 'english');

    expect(getLiveStageDraft('job-1', 'english')).toBeNull();
    expect(getLiveStageDraft('job-1', 'translation')).toMatchObject({
      text: 'Translation draft',
    });
  });

  it('lists and clears all drafts for one job', () => {
    setLiveStageDraft({
      attempt: 1,
      jobId: 'job-1',
      stage: 'english',
      status: 'streaming',
      text: 'English draft',
      updatedAt: '2026-04-14T09:00:00.000Z',
    });
    setLiveStageDraft({
      attempt: 1,
      jobId: 'job-1',
      stage: 'vocabulary',
      status: 'streaming',
      text: 'Vocabulary draft',
      updatedAt: '2026-04-14T09:00:01.000Z',
    });
    setLiveStageDraft({
      attempt: 1,
      jobId: 'job-2',
      stage: 'english',
      status: 'streaming',
      text: 'Other job draft',
      updatedAt: '2026-04-14T09:00:02.000Z',
    });

    expect(
      listLiveStageDraftsForJob('job-1').map((draft) => draft.stage),
    ).toEqual(['english', 'vocabulary']);

    clearLiveStageDraftsForJob('job-1');

    expect(listLiveStageDraftsForJob('job-1')).toEqual([]);
    expect(getLiveStageDraft('job-2', 'english')).toMatchObject({
      text: 'Other job draft',
    });
  });

  it('cleans up expired drafts during reads and writes', () => {
    setLiveStageDraft(
      {
        attempt: 1,
        jobId: 'job-1',
        stage: 'english',
        status: 'streaming',
        text: 'Old draft',
        updatedAt: '2026-04-14T09:00:00.000Z',
      },
      { now: 0 },
    );

    expect(getLiveStageDraft('job-1', 'english', { now: 31 * 60 * 1000 })).toBeNull();

    setLiveStageDraft(
      {
        attempt: 1,
        jobId: 'job-2',
        stage: 'grammar',
        status: 'streaming',
        text: 'Fresh draft',
        updatedAt: '2026-04-14T09:00:01.000Z',
      },
      { now: 31 * 60 * 1000 },
    );

    expect(listLiveStageDraftsForJob('job-1', { now: 31 * 60 * 1000 })).toEqual([]);
    expect(listLiveStageDraftsForJob('job-2', { now: 31 * 60 * 1000 })).toHaveLength(1);
  });
});
