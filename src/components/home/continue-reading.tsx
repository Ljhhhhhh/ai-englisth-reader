'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listRecentProgress } from '@/features/reader/progress-service';
import { getStageLabel } from '@/features/reader/stage-machine';
import { getOrCreateDeviceId } from '@/lib/device-id';

type ContinueReadingProps = {
  articles: Array<{
    slug: string;
    title: string;
  }>;
};

export function ContinueReading({ articles }: ContinueReadingProps) {
  const [currentArticle, setCurrentArticle] = useState<{
    paragraphId?: string;
    slug: string;
    stageLabel: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const storage = window.localStorage;
    const deviceId = getOrCreateDeviceId(storage);
    const [nextProgress] = listRecentProgress(deviceId, storage);

    if (!nextProgress) {
      return;
    }

    const article = articles.find(
      (item) => item.slug === nextProgress.articleSlug,
    );
    if (!article) {
      return;
    }

    queueMicrotask(() => {
      setCurrentArticle({
        paragraphId: nextProgress.paragraphId,
        slug: article.slug,
        stageLabel: getStageLabel(nextProgress.currentStage),
        title: article.title,
      });
    });
  }, [articles]);

  return (
    <section
      style={{
        padding: 24,
        borderRadius: 24,
        background: 'linear-gradient(135deg, #f9ead9 0%, #fffaf2 100%)',
        border: '1px solid var(--border)',
      }}
    >
      <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
        Continue reading
      </p>

      {currentArticle ? (
        <>
          <h2 style={{ marginBottom: 8 }}>{currentArticle.title}</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Resume from {currentArticle.stageLabel}
            {currentArticle.paragraphId
              ? ` · ${currentArticle.paragraphId}`
              : ''}
          </p>
          <Link
            href={`/reader/${currentArticle.slug}`}
            style={{
              width: 'fit-content',
              marginTop: 16,
              padding: '12px 18px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            Resume reading
          </Link>
        </>
      ) : (
        <>
          <h2 style={{ marginBottom: 8 }}>
            Your next article will appear here after you start reading.
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Once you enter an article, this block will surface the latest
            in-progress reading session on this device.
          </p>
        </>
      )}
    </section>
  );
}
