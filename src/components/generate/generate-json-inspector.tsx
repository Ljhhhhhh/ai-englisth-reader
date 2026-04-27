'use client';

import { useState } from 'react';

const jsonFieldLabels: Record<string, string> = {
  after: '升级写法',
  before: '原始写法',
  chinese_meaning: '中文义',
  chinese_title: '中文标题',
  chinese_translation: '全文译文',
  context_meaning: '语境义',
  difficulty: '难度',
  estimatedMinutes: '预计时长',
  explanation: '讲解',
  feynman_summary: '费曼摘要',
  growth_vocabulary: '重点单词',
  high_frequency_phrases: '高频词组',
  imitation_example: '仿写示例',
  keyPoint: '关键提醒',
  language_evolution: '语言升级',
  list_summary_zh: '中文摘要',
  memory_hook: '记忆钩子',
  memory_type: '记忆类型',
  paragraph_translations: '段落译文',
  paragraphs: '正文段落',
  phrase: '词组',
  rewritten_sentence: '改写句子',
  source: '来源',
  target_structure: '目标结构',
  title: '英文标题',
  usage_note: '使用说明',
  word: '单词',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function formatJsonLabel(key: string) {
  return (
    jsonFieldLabels[key] ??
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function formatPrimitiveValue(value: string | number | boolean | null) {
  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (value === null) {
    return 'null';
  }

  return String(value);
}

function getNodeKind(value: unknown) {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (isRecord(value)) {
    return 'object';
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function getNodeCountLabel(value: unknown) {
  if (Array.isArray(value)) {
    return `${value.length} items`;
  }

  if (isRecord(value)) {
    return `${Object.keys(value).length} fields`;
  }

  return null;
}

function getCollapsedPreview(value: unknown) {
  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]';
    }

    const preview = value
      .slice(0, 2)
      .map((item) =>
        isPrimitive(item) ? formatPrimitiveValue(item) : getNodeKind(item),
      )
      .join(', ');

    return value.length > 2 ? `${preview}, ...` : preview;
  }

  if (!isRecord(value)) {
    return null;
  }

  const keys = Object.keys(value);
  if (!keys.length) {
    return '{}';
  }

  const preview = keys.slice(0, 3).map((key) => formatJsonLabel(key)).join(' · ');
  return keys.length > 3 ? `${preview} · ...` : preview;
}

function getEntries(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item, index) => [`#${index + 1}`, item] as const);
  }

  if (isRecord(value)) {
    return Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  }

  return [];
}

function JsonInspectorNode(props: {
  depth: number;
  label?: string;
  nodeKey: string;
  value: unknown;
}) {
  const { depth, label, nodeKey, value } = props;
  const [expanded, setExpanded] = useState(depth === 0);
  const kind = getNodeKind(value);
  const countLabel = getNodeCountLabel(value);

  if (isPrimitive(value)) {
    return (
      <div className="generate-json-inspector__row" data-depth={depth}>
        {label ? (
          <span className="generate-json-inspector__key">{label}</span>
        ) : (
          <span className="generate-json-inspector__key">值</span>
        )}
        <div className="generate-json-inspector__value-wrap">
          <span className="generate-json-inspector__type-pill">{kind}</span>
          <code className="generate-json-inspector__value">
            {formatPrimitiveValue(value)}
          </code>
        </div>
      </div>
    );
  }

  const entries = getEntries(value);
  const collapsedPreview = getCollapsedPreview(value);

  return (
    <div className="generate-json-inspector__group" data-depth={depth}>
      <button
        type="button"
        className="generate-json-inspector__toggle"
        aria-expanded={expanded}
        aria-controls={nodeKey}
        aria-label={`切换${label ?? 'JSON 草稿'}`}
        onClick={() => setExpanded((current) => !current)}
      >
        <span
          className={`generate-json-inspector__caret ${
            expanded ? 'generate-json-inspector__caret--expanded' : ''
          }`}
          aria-hidden="true"
        >
          ▸
        </span>
        <span className="generate-json-inspector__key">
          {label ?? 'JSON 草稿'}
        </span>
        <span className="generate-json-inspector__meta">
          <span className="generate-json-inspector__type-pill">{kind}</span>
          {countLabel ? (
            <span className="generate-json-inspector__count">{countLabel}</span>
          ) : null}
          {!expanded && collapsedPreview ? (
            <span className="generate-json-inspector__preview">{collapsedPreview}</span>
          ) : null}
        </span>
      </button>

      {expanded ? (
        <div id={nodeKey} className="generate-json-inspector__children">
          {entries.map(([entryKey, entryValue]) => (
            <JsonInspectorNode
              key={`${nodeKey}-${entryKey}`}
              depth={depth + 1}
              label={formatJsonLabel(entryKey)}
              nodeKey={`${nodeKey}-${entryKey}`}
              value={entryValue}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GenerateJsonInspector(props: { value: unknown }) {
  return (
    <section className="generate-json-inspector" aria-label="SSE JSON 预览">
      <JsonInspectorNode depth={0} nodeKey="json-root" value={props.value} />
    </section>
  );
}

