'use client';

type LlmLoadingCardProps = {
  description: string;
  eyebrow: string;
  steps: readonly string[];
  title: string;
};

export function LlmLoadingCard({
  description,
  eyebrow,
  steps,
  title,
}: LlmLoadingCardProps) {
  return (
    <section className="llm-loading-card" aria-live="polite">
      <div className="llm-loading-card__eyebrow">
        <span className="llm-loading-card__dot" aria-hidden="true" />
        {eyebrow}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <h3 className="llm-loading-card__title">{title}</h3>
        <p className="llm-loading-card__description">{description}</p>
      </div>

      <div className="llm-loading-card__skeleton" aria-hidden="true">
        <div className="llm-loading-card__line llm-loading-card__line--short" />
        <div className="llm-loading-card__line llm-loading-card__line--long" />
        <div className="llm-loading-card__line llm-loading-card__line--medium" />
        <div className="llm-loading-card__line llm-loading-card__line--long" />
      </div>

      <ol className="llm-loading-card__steps">
        {steps.map((step) => (
          <li key={step} className="llm-loading-card__step">
            <span className="llm-loading-card__step-marker" aria-hidden="true" />
            <span className="llm-loading-card__step-text">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
