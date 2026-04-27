import { GenerateJsonInspector } from '@/components/generate/generate-json-inspector';
import { renderStreamingStageDraft } from '@/features/generation/stages/streaming-stage-render';

type GenerationStageName =
  | 'english'
  | 'vocabulary'
  | 'grammar'
  | 'translation'
  | 'finalize';

type GenerationStageRecord = {
  data?: unknown;
  error?: { message: string };
  status: 'pending' | 'running' | 'succeeded' | 'failed' | string;
};

type LiveStageDraft = {
  attempt: number;
  status: 'streaming' | 'completed' | 'cleared';
  text: string;
  updatedAt: string;
};

const stageLabels: Record<GenerationStageName, string> = {
  english: '第一轮 · 英文正文',
  finalize: '完成整理',
  grammar: '第三轮 · 语法讲解',
  translation: '第四轮 · 中文翻译',
  vocabulary: '第二轮 · 单词与高频词组',
};

const stageDescriptions: Record<GenerationStageName, string> = {
  english: '先产出可读的英文正文草稿，后续轮次都基于它继续加工。',
  finalize: '把四轮结果装配成最终文章记录，并发布阅读页入口。',
  grammar: '提炼本文最值得复用的语法升级点和仿写提示。',
  translation: '生成中文标题、全文译文和摘要，补齐阅读页中文信息。',
  vocabulary: '从英文正文抽取重点单词与高频词组，作为导读材料。',
};

const statusLabels: Record<string, string> = {
  failed: '失败',
  pending: '等待中',
  running: '生成中',
  succeeded: '已完成',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractStructuredJson(rawText: string) {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  const unfenced = normalized
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (!unfenced || (!unfenced.startsWith('{') && !unfenced.startsWith('['))) {
    return null;
  }

  try {
    return JSON.parse(unfenced) as unknown;
  } catch {
    return null;
  }
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { detail: '', label: item };
      }

      if (!isRecord(item)) {
        return null;
      }

      const label =
        typeof item.word === 'string'
          ? item.word
          : typeof item.phrase === 'string'
            ? item.phrase
            : typeof item.label === 'string'
              ? item.label
              : typeof item.title === 'string'
                ? item.title
                : null;

      const detail =
        typeof item.chinese_meaning === 'string'
          ? item.chinese_meaning
          : typeof item.context_meaning === 'string'
            ? item.context_meaning
            : typeof item.usage_note === 'string'
              ? item.usage_note
              : typeof item.detail === 'string'
                ? item.detail
                : '';

      if (!label) {
        return null;
      }

      return { detail, label };
    })
    .filter((item): item is { detail: string; label: string } => Boolean(item));
}

function renderVocabulary(record: GenerationStageRecord) {
  const data = isRecord(record.data) ? record.data : {};
  const vocabulary = toStringArray(data.growth_vocabulary);
  const phrases = toStringArray(data.high_frequency_phrases);

  return (
    <div className="generate-stage-preview__stack">
      {vocabulary.length ? (
        <div>
          <strong className="generate-stage-preview__subhead">重点单词</strong>
          <ul className="generate-stage-preview__list">
            {vocabulary.map((item) => (
              <li key={`v-${item.label}`} className="generate-stage-preview__list-item">
                <span className="generate-stage-preview__term">{item.label}</span>
                {item.detail ? (
                  <span className="generate-stage-preview__detail">{item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {phrases.length ? (
        <div>
          <strong className="generate-stage-preview__subhead">高频词组</strong>
          <ul className="generate-stage-preview__list">
            {phrases.map((item) => (
              <li key={`p-${item.label}`} className="generate-stage-preview__list-item">
                <span className="generate-stage-preview__term">{item.label}</span>
                {item.detail ? (
                  <span className="generate-stage-preview__detail">{item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function renderGrammar(record: GenerationStageRecord) {
  const data = isRecord(record.data) ? record.data : {};
  const payload = isRecord(data.language_evolution) ? data.language_evolution : data;
  const entries = Object.entries(payload).filter((entry): entry is [string, string] => {
    return typeof entry[1] === 'string' && Boolean(entry[1].trim());
  });

  if (!entries.length) {
    return null;
  }

  const labels: Record<string, string> = {
    after: '升级写法',
    before: '原始写法',
    explanation: '讲解',
    imitation_example: '仿写示例',
    keyPoint: '关键提醒',
    rewritten_sentence: '改写句子',
    target_structure: '目标结构',
  };

  return (
    <dl className="generate-stage-preview__definition-list">
      {entries.map(([key, value]) => (
        <div key={key} className="generate-stage-preview__definition-item">
          <dt className="generate-stage-preview__definition-term">
            {labels[key] ?? key}
          </dt>
          <dd className="generate-stage-preview__definition-detail">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderTranslation(record: GenerationStageRecord) {
  const data = isRecord(record.data) ? record.data : {};
  const bulletSummary =
    typeof data.list_summary_zh === 'string'
      ? [data.list_summary_zh]
      : Array.isArray(data.list_summary_zh)
        ? data.list_summary_zh.filter((item): item is string => typeof item === 'string')
        : [];
  const paragraphTranslations = Array.isArray(data.paragraph_translations)
    ? data.paragraph_translations.filter((item): item is string => typeof item === 'string')
    : [];

  return (
    <div className="generate-stage-preview__stack">
      {typeof data.chinese_title === 'string' ? (
        <div>
          <strong className="generate-stage-preview__subhead">中文标题</strong>
          <p className="generate-stage-preview__body">{data.chinese_title}</p>
        </div>
      ) : null}
      {bulletSummary.length ? (
        <div>
          <strong className="generate-stage-preview__subhead">中文摘要</strong>
          <ul className="generate-stage-preview__list">
            {bulletSummary.map((item) => (
              <li key={item} className="generate-stage-preview__list-item">
                <span className="generate-stage-preview__detail">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {typeof data.chinese_translation === 'string' ? (
        <div>
          <strong className="generate-stage-preview__subhead">全文译文</strong>
          <p className="generate-stage-preview__body">{data.chinese_translation}</p>
        </div>
      ) : null}
      {paragraphTranslations.length ? (
        <div>
          <strong className="generate-stage-preview__subhead">段落译文</strong>
          <ol className="generate-stage-preview__list">
            {paragraphTranslations.map((item, index) => (
              <li
                key={`${index + 1}-${item}`}
                className="generate-stage-preview__list-item"
              >
                <span className="generate-stage-preview__term">{`第 ${index + 1} 段`}</span>
                <span className="generate-stage-preview__detail">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function renderFinalize(record: GenerationStageRecord) {
  const data = isRecord(record.data) ? record.data : {};
  const paragraphCount = Array.isArray(data.paragraphs) ? data.paragraphs.length : null;

  return (
    <dl className="generate-stage-preview__definition-list">
      {typeof data.title === 'string' ? (
        <div className="generate-stage-preview__definition-item">
          <dt className="generate-stage-preview__definition-term">英文标题</dt>
          <dd className="generate-stage-preview__definition-detail">{data.title}</dd>
        </div>
      ) : null}
      {typeof data.source === 'string' ? (
        <div className="generate-stage-preview__definition-item">
          <dt className="generate-stage-preview__definition-term">来源</dt>
          <dd className="generate-stage-preview__definition-detail">{data.source}</dd>
        </div>
      ) : null}
      {typeof data.difficulty === 'string' ? (
        <div className="generate-stage-preview__definition-item">
          <dt className="generate-stage-preview__definition-term">难度</dt>
          <dd className="generate-stage-preview__definition-detail">{data.difficulty}</dd>
        </div>
      ) : null}
      {typeof data.estimatedMinutes === 'number' ? (
        <div className="generate-stage-preview__definition-item">
          <dt className="generate-stage-preview__definition-term">预计时长</dt>
          <dd className="generate-stage-preview__definition-detail">
            {`${data.estimatedMinutes} 分钟`}
          </dd>
        </div>
      ) : null}
      {paragraphCount !== null ? (
        <div className="generate-stage-preview__definition-item">
          <dt className="generate-stage-preview__definition-term">正文段落</dt>
          <dd className="generate-stage-preview__definition-detail">
            {`共 ${paragraphCount} 段`}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function renderEnglish(record: GenerationStageRecord) {
  const data = isRecord(record.data) ? record.data : {};

  if (typeof data.feynman_summary !== 'string') {
    return null;
  }

  return <p className="generate-stage-preview__body">{data.feynman_summary}</p>;
}

function renderStageBody(stage: GenerationStageName, record: GenerationStageRecord) {
  switch (stage) {
    case 'english':
      return renderEnglish(record);
    case 'vocabulary':
      return renderVocabulary(record);
    case 'grammar':
      return renderGrammar(record);
    case 'translation':
      return renderTranslation(record);
    case 'finalize':
      return renderFinalize(record);
    default:
      return null;
  }
}

function renderLiveDraft(stage: GenerationStageName, draft: LiveStageDraft) {
  const structuredJson = extractStructuredJson(draft.text);

  return (
    <div className="generate-stage-preview__stack">
      <div>
        <strong className="generate-stage-preview__subhead">实时生成中</strong>
        {structuredJson ? (
          <GenerateJsonInspector value={structuredJson} />
        ) : (
          <p className="generate-stage-preview__body">
            {renderStreamingStageDraft(stage, draft.text)}
          </p>
        )}
      </div>
    </div>
  );
}

export function GenerateStagePreview(props: {
  draft?: LiveStageDraft | null;
  record: GenerationStageRecord;
  revision: number;
  stage: GenerationStageName;
}) {
  const { draft, record, revision, stage } = props;
  const body =
    record.data != null ? renderStageBody(stage, record) : draft ? renderLiveDraft(stage, draft) : renderStageBody(stage, record);

  if (!body && !record.error) {
    return null;
  }

  return (
    <section className="generate-panel generate-stage-preview">
      <div className="generate-stage-preview__header">
        <div>
          <span className="generate-panel__eyebrow">{stageLabels[stage]}</span>
          <h3 className="generate-stage-preview__title">{stageDescriptions[stage]}</h3>
        </div>
        <div className="generate-stage-preview__meta">
          <span className={`generate-status-pill generate-status-pill--${record.status}`}>
            {statusLabels[record.status] ?? record.status}
          </span>
          <span className="generate-stage-preview__revision">{`rev ${revision}`}</span>
        </div>
      </div>
      {record.error ? (
        <p className="generate-feedback generate-feedback--error">{record.error.message}</p>
      ) : null}
      {body}
    </section>
  );
}

export type { GenerationStageName, GenerationStageRecord };
