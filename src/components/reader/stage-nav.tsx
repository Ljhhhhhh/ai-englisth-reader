import {
  getStageLabel,
  readerStages,
  type ReaderStage,
} from '@/features/reader/stage-machine';
import { uiCopy } from '@/lib/ui-copy';

type StageNavProps = {
  currentStage: ReaderStage;
  onSelectStage: (stage: ReaderStage) => void;
  canSelectStage?: (stage: ReaderStage) => boolean;
};

export function StageNav({
  currentStage,
  onSelectStage,
  canSelectStage = () => true,
}: StageNavProps) {
  return (
    <nav
      aria-label={uiCopy.reader.stageNav.ariaLabel}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
    >
      {readerStages.map((stage) => {
        const selected = stage === currentStage;
        const disabled = !canSelectStage(stage);

        return (
          <button
            key={stage}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onSelectStage(stage)}
            style={{
              borderRadius: 999,
              border: selected
                ? '1px solid var(--accent)'
                : '1px solid var(--border)',
              background: selected
                ? 'var(--accent)'
                : disabled
                  ? '#f4efe7'
                  : 'var(--surface)',
              color: selected
                ? '#fff'
                : disabled
                  ? 'var(--muted)'
                  : 'var(--foreground)',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.72 : 1,
            }}
          >
            {getStageLabel(stage)}
          </button>
        );
      })}
    </nav>
  );
}
