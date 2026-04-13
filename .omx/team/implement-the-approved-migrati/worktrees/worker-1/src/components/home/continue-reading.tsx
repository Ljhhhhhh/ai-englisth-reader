'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadClientSession } from '@/features/auth/client-session';
import { listRecentProgress } from '@/features/reader/progress-service';
import { getStageLabel, type ReaderStage } from '@/features/reader/stage-machine';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { uiCopy } from '@/lib/ui-copy';

type ContinueReadingProps = {
  articles: Array<{
    chineseTitle: string;
    slug: string;
  }>;
};

export function ContinueReading({ articles }: ContinueReadingProps) {
  const [currentArticle, setCurrentArticle] = useState<{
    slug: string;
    stageLabel: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const storage = window.localStorage;

      try {
        if (process.env.NODE_ENV !== 'test') {
          const session = await loadClientSession();

          if (session?.authenticated && session.user) {
            const response = await fetch('/api/progress', {
              cache: 'no-store',
            });

            if (response.ok) {
              const records = (await response.json()) as Array<{
                articleSlug: string;
                currentStage: string;
                isCompleted: boolean;
              }>;
              const nextProgress = records.find((record) => !record.isCompleted);

              if (cancelled || !nextProgress) {
                return;
              }

              const article = articles.find(
                (item) => item.slug === nextProgress.articleSlug,
              );

              if (!article) {
                return;
              }

              setCurrentArticle({
                slug: article.slug,
                stageLabel: getStageLabel(nextProgress.currentStage as ReaderStage),
                title: article.chineseTitle,
              });
              return;
            }
          }
        }
      } catch {
        // fall back to local state
      }

      const deviceId = getOrCreateDeviceId(storage);
      const nextProgress = listRecentProgress(deviceId, storage).find(
        (record) => !record.isCompleted,
      );

      if (!nextProgress || cancelled) {
        return;
      }

      const article = articles.find(
        (item) => item.slug === nextProgress.articleSlug,
      );
      if (!article) {
        return;
      }

      setCurrentArticle({
        slug: article.slug,
        stageLabel: getStageLabel(nextProgress.currentStage),
        title: article.chineseTitle,
      });
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [articles]);

  return (
    <section
      style={{
        display: 'grid',
        gap: 16,
        padding: 24,
        borderRadius: 24,
        background: 'linear-gradient(135deg, #f9ead9 0%, #fffaf2 100%)',
        border: '1px solid var(--border)',
      }}
    >
      <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
        {uiCopy.continueReading.eyebrow}
      </p>

      {currentArticle ? (
        <>
          <h2 style={{ margin: 0 }}>{currentArticle.title}</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            {uiCopy.continueReading.resumeFrom(currentArticle.stageLabel)}
          </p>
          <Link
            href={`/reader/${currentArticle.slug}`}
            style={{
              width: 'fit-content',
              display: 'inline-flex',
              padding: '12px 18px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {uiCopy.continueReading.button}
          </Link>
        </>
      ) : (
        <>
          <h2 style={{ margin: 0 }}>
            {uiCopy.continueReading.emptyTitle}
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            {uiCopy.continueReading.description}
          </p>
        </>
      )}
    </section>
  );
}
