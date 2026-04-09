import Link from 'next/link';
import { ErrorState } from '@/components/system/error-state';
import { uiCopy } from '@/lib/ui-copy';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 20px 72px',
        display: 'grid',
        gap: 24,
      }}
    >
      <ErrorState
        eyebrow={uiCopy.notFound.eyebrow}
        title={uiCopy.notFound.title}
        description={uiCopy.notFound.description}
      >
        <Link
          href="/"
          style={{
            width: 'fit-content',
            padding: '12px 18px',
            borderRadius: 999,
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {uiCopy.common.backHome}
        </Link>
      </ErrorState>
    </main>
  );
}
