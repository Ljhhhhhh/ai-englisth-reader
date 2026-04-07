import {
  getStageLabel,
  readerStages,
  type ReaderStage,
} from '@/features/reader/stage-machine';

type StageNavProps = {
  currentStage: ReaderStage;
  onSelectStage: (stage: ReaderStage) => void;
};

export function StageNav({ currentStage, onSelectStage }: StageNavProps) {
  return (
    <nav
      aria-label="Reader stages"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
    >
      {readerStages.map((stage) => {
        const selected = stage === currentStage;

        return (
          <button
            key={stage}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelectStage(stage)}
            style={{
              borderRadius: 999,
              border: selected
                ? '1px solid var(--accent)'
                : '1px solid var(--border)',
              background: selected ? 'var(--accent)' : 'var(--surface)',
              color: selected ? '#fff' : 'var(--foreground)',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {getStageLabel(stage)}
          </button>
        );
      })}
    </nav>
  );
}
