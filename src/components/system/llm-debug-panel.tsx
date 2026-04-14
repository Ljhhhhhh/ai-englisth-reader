'use client';

import { useState, type ReactNode } from 'react';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';

type LlmDebugPanelProps = {
  emptyLabel: string;
  record: LlmDebugRecord | null;
};

function formatStructuredPayload(value: unknown) {
  if (value == null) {
    return 'null';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'baseline',
        flexWrap: 'wrap',
      }}
    >
      <strong style={{ fontSize: 13 }}>{label}</strong>
      <span style={{ color: 'var(--muted)', fontSize: 14 }}>{value}</span>
    </div>
  );
}

function Section({
  title,
  tone = 'default',
  children,
}: {
  children: ReactNode;
  title: string;
  tone?: 'default' | 'error';
}) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 8,
        padding: 14,
        borderRadius: 16,
        border:
          tone === 'error'
            ? '1px solid rgba(194, 65, 12, 0.18)'
            : '1px solid rgba(214, 183, 154, 0.55)',
        background: tone === 'error' ? '#fff7ed' : 'rgba(255, 253, 248, 0.96)',
      }}
    >
      <strong style={{ fontSize: 13 }}>{title}</strong>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        borderRadius: 12,
        background: '#1f2937',
        color: '#f8fafc',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: 12,
        lineHeight: 1.55,
      }}
    >
      {children}
    </pre>
  );
}

export function LlmDebugPanel({
  emptyLabel,
  record,
}: LlmDebugPanelProps) {
  if (!record) {
    return (
      <section
        style={{
          display: 'grid',
          gap: 8,
          padding: 16,
          borderRadius: 18,
          border: '1px dashed rgba(214, 183, 154, 0.8)',
          background: 'rgba(255, 248, 238, 0.72)',
        }}
      >
        <strong style={{ fontSize: 14 }}>LLM 调用日志（开发环境）</strong>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{emptyLabel}</span>
      </section>
    );
  }

  return <PopulatedLlmDebugPanel key={record.callId} record={record} />;
}

function PopulatedLlmDebugPanel({ record }: { record: LlmDebugRecord }) {
  const [expanded, setExpanded] = useState(record.status === 'failed');

  return (
    <section
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        borderRadius: 18,
        border: '1px solid rgba(214, 183, 154, 0.8)',
        background: 'rgba(255, 248, 238, 0.84)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 14 }}>LLM 调用日志（开发环境）</strong>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              fontSize: 12,
            }}
          >
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 999,
                background: '#fff',
                border: '1px solid rgba(214, 183, 154, 0.72)',
              }}
            >
              {record.summary.callType}
            </span>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 999,
                background: record.status === 'failed' ? '#ffedd5' : '#dcfce7',
                color: record.status === 'failed' ? '#9a3412' : '#166534',
              }}
            >
              {record.status === 'failed' ? 'failed' : 'success'}
            </span>
            <span style={{ color: 'var(--muted)' }}>
              {record.meta.durationMs}ms
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          style={{
            borderRadius: 999,
            border: '1px solid rgba(214, 183, 154, 0.72)',
            background: '#fff',
            padding: '8px 12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {expanded ? '收起日志' : '展开日志'}
        </button>
      </div>

      {expanded ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <Section title="输入摘要">
            <SummaryRow label="触发入口" value={record.summary.trigger} />
            <SummaryRow label="模型" value={record.summary.model} />
            <SummaryRow label="选中文本" value={record.summary.selectedText} />
            <SummaryRow label="句子 ID" value={record.summary.sentenceId} />
            <SummaryRow label="来源类型" value={record.summary.sourceType} />
            <SummaryRow label="来源摘要" value={record.summary.sourceRefLabel} />
            <SummaryRow
              label="尝试次数"
              value={record.meta.attempt ? String(record.meta.attempt) : undefined}
            />
          </Section>

          <Section title="原始输出">
            <CodeBlock>
              {record.rawOutput.preview ??
                (record.rawOutput.available ? '' : 'No raw preview available.')}
            </CodeBlock>
          </Section>

          <Section title={`结构化结果 · ${record.structuredResult.status}`}>
            <CodeBlock>{formatStructuredPayload(record.structuredResult.data)}</CodeBlock>
          </Section>

          {record.error ? (
            <Section title={`错误信息 · ${record.error.stage}`} tone="error">
              <p
                style={{
                  margin: 0,
                  color: '#9a3412',
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                {record.error.message}
              </p>
            </Section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
