import type { ReactNode } from 'react';

type EmptyStateProps = {
  children?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function EmptyState({
  children,
  description,
  eyebrow,
  title,
}: EmptyStateProps) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 14,
        padding: 24,
        borderRadius: 24,
        border: '1px dashed var(--border)',
        background: 'rgba(255, 253, 248, 0.8)',
      }}
    >
      {eyebrow ? (
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
          {eyebrow}
        </p>
      ) : null}
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
        {description}
      </p>
      {children ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
