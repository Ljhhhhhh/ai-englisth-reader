import type { ReactNode } from 'react';

type ErrorStateProps = {
  children?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function ErrorState({
  children,
  description,
  eyebrow,
  title,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      style={{
        display: 'grid',
        gap: 14,
        padding: 24,
        borderRadius: 24,
        border: '1px solid #d6b79a',
        background: 'linear-gradient(135deg, #fff7ef 0%, #fffdf8 100%)',
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
