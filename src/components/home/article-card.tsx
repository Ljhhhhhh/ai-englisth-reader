import Link from 'next/link';
import { formatEstimatedMinutes, uiCopy } from '@/lib/ui-copy';

type ArticleCardProps = {
  slug: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  summary: string;
};

export function ArticleCard({
  slug,
  title,
  difficulty,
  estimatedMinutes,
  summary,
}: ArticleCardProps) {
  return (
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        padding: 24,
        boxShadow: '0 16px 48px rgba(104, 71, 33, 0.08)',
      }}
    >
      <p style={{ color: 'var(--accent)', margin: 0, fontSize: 14 }}>
        {difficulty} · {formatEstimatedMinutes(estimatedMinutes)}
      </p>
      <h2 style={{ fontSize: 28, marginBottom: 12 }}>{title}</h2>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{summary}</p>
      <Link
        href={`/reader/${slug}`}
        style={{
          display: 'inline-flex',
          marginTop: 16,
          padding: '12px 18px',
          borderRadius: 999,
          background: 'var(--accent)',
          color: '#fff',
          fontWeight: 600,
        }}
      >
        {uiCopy.articleCard.startReading}
      </Link>
    </article>
  );
}
