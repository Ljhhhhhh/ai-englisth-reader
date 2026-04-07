import Link from 'next/link';
import { ErrorState } from '@/components/system/error-state';

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
        eyebrow="Not found"
        title="That article route does not exist."
        description="The requested article could not be found. Return to the homepage and start from an available reading card."
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
          Back to homepage
        </Link>
      </ErrorState>
    </main>
  );
}
