import {
  getStageLabel,
  getStageProgress,
  type ReaderStage,
} from '@/features/reader/stage-machine';
import { uiCopy } from '@/lib/ui-copy';

type ProgressBarProps = {
  currentStage: ReaderStage;
};

export function ProgressBar({ currentStage }: ProgressBarProps) {
  const progress = getStageProgress(currentStage);

  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        padding: '16px 18px',
        borderRadius: 20,
        background: 'rgba(255, 253, 248, 0.82)',
        border: '1px solid var(--border)',
        position: 'sticky',
        top: 16,
        zIndex: 2,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 14,
        }}
      >
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {uiCopy.reader.progress.title}
        </span>
        <span style={{ color: 'var(--muted)' }}>
          {getStageLabel(currentStage)}
        </span>
      </div>
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          height: 8,
          borderRadius: 999,
          background: 'var(--accent-soft)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #c56a2d 0%, #d7834c 100%)',
          }}
        />
      </div>
    </div>
  );
}
