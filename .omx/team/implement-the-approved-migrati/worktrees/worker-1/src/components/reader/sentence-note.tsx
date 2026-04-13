type SentenceNoteProps = {
  body: string;
  label: string;
  title: string;
};

export function SentenceNote({ body, label, title }: SentenceNoteProps) {
  return (
    <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
      <strong>{title}</strong>
      <div style={{ color: 'var(--accent)', marginTop: 6, fontSize: 14 }}>
        {label}
      </div>
      <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
        {body}
      </p>
    </div>
  );
}
