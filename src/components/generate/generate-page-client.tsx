'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  GenerateStagePreview,
  type GenerationStageName,
  type GenerationStageRecord,
} from '@/components/generate/generate-stage-preview';
import { loadClientSession } from '@/features/auth/client-session';
import { LlmDebugPanel } from '@/components/system/llm-debug-panel';
import { LlmLoadingCard } from '@/components/system/llm-loading-card';
import { isClientLlmDebugEnabled } from '@/features/llm-debug/debug-config';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { uiCopy } from '@/lib/ui-copy';

type JobStatus = 'pending' | 'processing' | 'done' | 'failed' | string;

type JobSnapshot = {
  articleSlug: string | null;
  currentStep: GenerationStageName | null;
  id: string;
  lastError: {
    message: string;
    stage?: GenerationStageName;
  } | null;
  llmDebug?: LlmDebugRecord | null;
  revision: number;
  retryable: boolean;
  stages: Record<GenerationStageName, GenerationStageRecord>;
  status: JobStatus;
};

type JobCreateResponse = {
  error?: string;
  id: string;
  status: JobStatus;
};

type SessionResponse = {
  authenticated: boolean;
  user: {
    email: string;
    id: string;
  } | null;
};

type LiveStageDraft = {
  attempt: number;
  jobId: string;
  stage: GenerationStageName;
  status: 'streaming' | 'completed' | 'cleared';
  text: string;
  updatedAt: string;
};

const stageOrder: GenerationStageName[] = [
  'english',
  'vocabulary',
  'grammar',
  'translation',
  'finalize',
];

const stageStepNumbers: Record<GenerationStageName, string> = {
  english: '01',
  finalize: '05',
  grammar: '03',
  translation: '04',
  vocabulary: '02',
};

const stageLabels: Record<GenerationStageName, string> = {
  english: '英文正文',
  finalize: '整理发布',
  grammar: '语法讲解',
  translation: '中文翻译',
  vocabulary: '单词与词组',
};

const detailedStageLabels: Record<GenerationStageName, string> = {
  english: '第一轮 · 英文正文',
  finalize: '第五轮 · 整理发布',
  grammar: '第三轮 · 语法讲解',
  translation: '第四轮 · 中文翻译',
  vocabulary: '第二轮 · 单词与词组',
};

function createEmptyStages(): Record<
  GenerationStageName,
  GenerationStageRecord
> {
  return {
    english: { status: 'pending' },
    finalize: { status: 'pending' },
    grammar: { status: 'pending' },
    translation: { status: 'pending' },
    vocabulary: { status: 'pending' },
  };
}

function createPendingJob(id: string, status: JobStatus): JobSnapshot {
  return {
    articleSlug: null,
    currentStep: null,
    id,
    lastError: null,
    revision: 0,
    retryable: false,
    stages: createEmptyStages(),
    status,
  };
}

function getGenerateLoadingCopy(
  status: Extract<JobStatus, 'pending' | 'processing'>,
  step?: GenerationStageName | null,
) {
  if (status === 'pending') {
    return {
      description: uiCopy.generate.queuedDescription,
      eyebrow: uiCopy.generate.queuedEyebrow,
      steps: uiCopy.generate.queuedSteps,
      title: uiCopy.generate.queuedTitle,
    };
  }

  const stepCopy =
    step === 'english'
      ? {
          description:
            '正在生成第一轮英文正文，后续词汇、语法和翻译都会基于这版继续展开。',
          eyebrow: '第一轮英文正文',
          steps: [
            '整理英文正文主线',
            '确认可继续加工的语义结构',
            '持久化第一轮预览',
          ],
          title: '正在起草英文文章',
        }
      : step === 'vocabulary'
        ? {
            description: '正在从英文正文中提炼重点单词和高频词组。',
            eyebrow: '第二轮单词与词组',
            steps: ['定位重点词汇', '筛选高频词组', '写入导读预览'],
            title: '正在整理词汇材料',
          }
        : step === 'grammar'
          ? {
              description: '正在总结本文最值得模仿的语法升级点。',
              eyebrow: '第三轮语法讲解',
              steps: ['定位目标结构', '补齐讲解与仿写', '写入语法预览'],
              title: '正在生成语法讲解',
            }
          : step === 'translation'
            ? {
                description: '正在补齐中文标题、摘要和全文翻译。',
                eyebrow: '第四轮中文翻译',
                steps: ['生成中文标题', '整理摘要与全文译文', '持久化翻译预览'],
                title: '正在生成中文版本',
              }
            : step === 'finalize'
              ? {
                  description:
                    '四轮结果已经齐备，正在装配最终文章并发布阅读入口。',
                  eyebrow: '整理最终文章',
                  steps: ['合并四轮结果', '写入文章记录', '发布阅读页入口'],
                  title: '正在整理最终成稿',
                }
              : null;

  return (
    stepCopy ?? {
      description: uiCopy.generate.processingDescription,
      eyebrow: uiCopy.generate.processingEyebrow,
      steps: uiCopy.generate.processingSteps,
      title: uiCopy.generate.processingTitle,
    }
  );
}

function getStatusLabel(status: JobStatus) {
  if (status === 'pending') {
    return '排队中';
  }

  if (status === 'processing') {
    return '生成中';
  }

  if (status === 'done') {
    return '已完成';
  }

  return '需重试';
}

function getStatusDescription(job: JobSnapshot) {
  if (job.status === 'pending') {
    return '任务已提交，正在等待生成器领取。';
  }

  if (job.status === 'processing') {
    if (job.currentStep) {
      return `当前正在处理：${stageLabels[job.currentStep]}。`;
    }

    return '正在同步最新轮次结果。';
  }

  if (job.status === 'done') {
    return '四轮结果已经整理完成，可以进入阅读页查看最终文章。';
  }

  const failedStage = job.lastError?.stage
    ? detailedStageLabels[job.lastError.stage]
    : '本次任务';

  return job.retryable
    ? `${failedStage}生成失败，可从当前轮次继续。`
    : `${failedStage}生成失败，请稍后重新发起任务。`;
}

function shouldRenderStagePreview(record: GenerationStageRecord) {
  return (
    record.status !== 'pending' || Boolean(record.data) || Boolean(record.error)
  );
}

export default function GeneratePageClient() {
  const fileInputId = useId();
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    process.env.NODE_ENV === 'test',
  );
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveDrafts, setLiveDrafts] = useState<
    Partial<Record<GenerationStageName, LiveStageDraft>>
  >({});
  const [streamNonce, setStreamNonce] = useState(0);
  const [user, setUser] = useState<SessionResponse['user']>(null);
  const showDebugPanel = isClientLlmDebugEnabled() || Boolean(job?.llmDebug);

  useEffect(() => {
    const storage =
      typeof window.localStorage?.getItem === 'function' &&
      typeof window.localStorage?.setItem === 'function'
        ? window.localStorage
        : undefined;
    setDeviceId(getOrCreateDeviceId(storage));
    void loadClientSession()
      .then((session) => {
        setIsAuthenticated(Boolean(session?.authenticated));
        setUser(session?.user ?? null);
      })
      .finally(() => {
        setIsLoadingSession(false);
      });
  }, []);

  useEffect(() => {
    if (!job?.id) {
      return;
    }

    const eventSource = new window.EventSource(
      `/api/generate/${job.id}/events`,
    );
    const handleSnapshot = (event: MessageEvent<string>) => {
      const nextJob = JSON.parse(event.data) as JobSnapshot;

      setJob((current) => {
        if (current && nextJob.revision < current.revision) {
          return current;
        }

        return nextJob;
      });

      setLiveDrafts((current) => {
        const nextDrafts = { ...current };

        for (const stage of stageOrder) {
          if (
            nextJob.stages[stage].data != null ||
            nextJob.stages[stage].status === 'failed'
          ) {
            delete nextDrafts[stage];
          }
        }

        return nextDrafts;
      });

      if (nextJob.status === 'done' || nextJob.status === 'failed') {
        eventSource.close();
      }
    };
    const handleStageDraft = (event: MessageEvent<string>) => {
      const nextDraft = JSON.parse(event.data) as LiveStageDraft;

      setLiveDrafts((current) => {
        if (nextDraft.status === 'cleared') {
          const nextValue = { ...current };
          delete nextValue[nextDraft.stage];
          return nextValue;
        }

        return {
          ...current,
          [nextDraft.stage]: nextDraft,
        };
      });
    };

    const handleError = () => {
      eventSource.close();
    };

    eventSource.addEventListener('snapshot', handleSnapshot);
    eventSource.addEventListener(
      'stage_draft',
      handleStageDraft as EventListener,
    );
    eventSource.addEventListener('error', handleError as EventListener);

    return () => {
      eventSource.removeEventListener('snapshot', handleSnapshot);
      eventSource.removeEventListener(
        'stage_draft',
        handleStageDraft as EventListener,
      );
      eventSource.removeEventListener('error', handleError as EventListener);
      eventSource.close();
    };
  }, [job?.id, streamNonce]);

  const canSubmit = useMemo(() => {
    if ((!deviceId && process.env.NODE_ENV === 'test') || isSubmitting) {
      return false;
    }

    if (process.env.NODE_ENV !== 'test' && !isAuthenticated) {
      return false;
    }

    return mode === 'url' ? Boolean(url.trim()) : Boolean(file);
  }, [deviceId, file, isAuthenticated, isSubmitting, mode, url]);

  const sourceLabel = mode === 'url' ? '网页链接' : '本地稿件';
  const sourceTitle =
    mode === 'url'
      ? url.trim() || '等待贴入文章链接'
      : file
        ? '已接收 1 份待加工稿件'
        : '等待放入稿件文件';
  const sourceDescription =
    mode === 'url'
      ? '适合直接从网页抓取正文，系统会清洗结构后进入生成流程。'
      : file
        ? '文件已经放入工作台，生成时会按当前 prompt 读取内容并重写为精读文章。'
        : '支持 md、txt、docx，适合本地草稿、提纲和归档文稿。';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (process.env.NODE_ENV !== 'test' && !isAuthenticated) {
      setError('请先登录后再生成文章。');
      return;
    }

    if (process.env.NODE_ENV === 'test' && !deviceId) {
      setError('设备标识尚未准备好，请稍后再试。');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setJob(null);
    setLiveDrafts({});

    try {
      const formData = new FormData();
      if (process.env.NODE_ENV === 'test' && deviceId) {
        formData.set('deviceId', deviceId);
      }

      if (mode === 'url') {
        formData.set('url', url.trim());
      } else if (file) {
        formData.set('file', file);
      }

      const response = await fetch('/api/generate', {
        body: formData,
        method: 'POST',
      });
      const payload = (await response.json()) as JobCreateResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? '提交生成任务失败。');
      }

      setJob(createPendingJob(payload.id, payload.status));
      setStreamNonce((value) => value + 1);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : '提交生成任务失败。',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRetry() {
    if (!job) {
      return;
    }

    setIsRetrying(true);
    setError(null);
    setLiveDrafts({});

    try {
      const response = await fetch(`/api/generate/${job.id}/retry`, {
        method: 'POST',
      });
      const payload = (await response.json()) as JobCreateResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? '重试生成失败。');
      }

      setJob((current) =>
        current
          ? {
              ...current,
              lastError: null,
              retryable: false,
              status: payload.status,
            }
          : createPendingJob(payload.id, payload.status),
      );
      setStreamNonce((value) => value + 1);
    } catch (retryError) {
      setError(
        retryError instanceof Error ? retryError.message : '重试生成失败。',
      );
    } finally {
      setIsRetrying(false);
    }
  }

  const visiblePreviews = useMemo(() => {
    if (!job) {
      return [];
    }

    return stageOrder.filter(
      (stage) =>
        shouldRenderStagePreview(job.stages[stage]) ||
        Boolean(liveDrafts[stage]),
    );
  }, [job, liveDrafts]);

  const hasStartedGeneration = Boolean(job);

  return (
    <main className="generate-page">
      <section className="generate-page__shell">
        <div className="generate-hero">
          <p className="generate-hero__eyebrow">言序内容工坊</p>
          <h1 className="generate-hero__title">生成新的精读文章</h1>
          <p className="generate-hero__description">
            你可以提交文章链接，或上传 .md、.txt、.docx 文件。言序会按当前
            prompt 生成精读 JSON，并自动写入阅读内容目录。
          </p>
          <div className="generate-hero__actions">
            <Link
              href="/"
              className="generate-link-pill generate-link-pill--accent"
            >
              返回首页
            </Link>
            <Link href="/words?from=home" className="generate-link-pill">
              查看生词本
            </Link>
          </div>
        </div>

        {isLoadingSession ? (
          <section className="generate-info-card">
            <p className="generate-info-card__eyebrow">正在进入工坊</p>
            <p className="generate-info-card__body">正在确认登录状态...</p>
          </section>
        ) : !user ? (
          <section className="generate-info-card">
            <p className="generate-info-card__eyebrow">需要账号权限</p>
            <h2 className="generate-info-card__title">请先登录账号</h2>
            <p className="generate-info-card__body">
              生成任务已经切到账号体系。登录后，生成次数、任务状态和后续产物都会跟随你的账号。
            </p>
            <div>
              <Link
                href="/login"
                className="generate-link-pill generate-link-pill--accent"
              >
                去登录
              </Link>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="generate-studio">
            {!hasStartedGeneration ? (
              <section className="generate-panel generate-panel--main">
                <div className="generate-panel__header">
                  <span className="generate-panel__eyebrow">稿件入口</span>
                  <h2 className="generate-panel__title">
                    把素材整理进本次生成任务
                  </h2>
                  <p className="generate-panel__description">
                    先确认来源，再检查稿件信息，提交后右侧会持续显示最新进度和结果入口。
                  </p>
                </div>

                <div
                  className="generate-mode-switch"
                  role="tablist"
                  aria-label="选择生成来源"
                >
                  <button
                    type="button"
                    onClick={() => setMode('url')}
                    className={`generate-mode-button ${
                      mode === 'url' ? 'generate-mode-button--active' : ''
                    }`}
                    aria-pressed={mode === 'url'}
                  >
                    链接
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('file')}
                    className={`generate-mode-button ${
                      mode === 'file' ? 'generate-mode-button--active' : ''
                    }`}
                    aria-pressed={mode === 'file'}
                  >
                    文件
                  </button>
                </div>

                {mode === 'url' ? (
                  <label key="url-input" className="generate-field">
                    <span className="generate-field__label">文章链接</span>
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://example.com/article"
                      className="generate-input"
                    />
                    <span className="generate-field__hint">
                      建议粘贴可直接访问的正文链接，生成前会自动抽取主要内容。
                    </span>
                  </label>
                ) : (
                  <div key="file-input" className="generate-upload-grid">
                    <div className="generate-upload-stack">
                      <input
                        id={fileInputId}
                        type="file"
                        accept=".md,.txt,.docx"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          setFile(nextFile);
                        }}
                        className="generate-visually-hidden"
                      />
                      <label
                        htmlFor={fileInputId}
                        aria-label="将稿件放入工作台"
                        className={`generate-dropzone ${
                          file ? 'generate-dropzone--filled' : ''
                        }`}
                      >
                        <span
                          className="generate-dropzone__icon"
                          aria-hidden="true"
                        >
                          FILE
                        </span>
                        <span className="generate-dropzone__title">
                          将稿件放入工作台
                        </span>
                        <span className="generate-dropzone__description">
                          点击挑选要加工的稿件，系统会按当前 prompt
                          抽取正文并生成新的精读文章。
                        </span>
                        <div className="generate-chip-row">
                          {['.md', '.txt', '.docx'].map((item) => (
                            <span key={item} className="generate-chip">
                              {item}
                            </span>
                          ))}
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div className="generate-submit-row">
                  <div className="generate-submit-row__primary">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="generate-submit-button"
                    >
                      {isSubmitting ? uiCopy.generate.submitBusy : '开始生成'}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p
                    className="generate-feedback generate-feedback--error"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </section>
            ) : null}

            <aside className="generate-side-stack">
              {!hasStartedGeneration ? (
                <section className="generate-panel">
                  <div className="generate-side-card__header">
                    <span className="generate-panel__eyebrow">本次素材</span>
                    <strong className="generate-side-card__title">
                      {sourceLabel}
                    </strong>
                  </div>
                  <p className="generate-side-card__lead">{sourceTitle}</p>
                  <p className="generate-side-card__body">{sourceDescription}</p>
                  <div className="generate-process-list">
                    {stageOrder.map((stage) => (
                      <div key={stage} className="generate-process-item">
                        <span className="generate-process-item__index">
                          {stageStepNumbers[stage]}
                        </span>
                        <span>{stageLabels[stage]}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section
                className={`generate-status-card ${
                  job
                    ? `generate-status-card--${job.status}`
                    : 'generate-status-card--idle'
                }`}
              >
                <div className="generate-status-card__header">
                  <div className="generate-status-pill">
                    {job ? getStatusLabel(job.status) : '待开始'}
                  </div>
                  <strong className="generate-side-card__title">
                    任务状态
                  </strong>
                </div>

                {job &&
                (job.status === 'pending' || job.status === 'processing') ? (
                  <LlmLoadingCard
                    {...getGenerateLoadingCopy(
                      job.status as Extract<
                        JobStatus,
                        'pending' | 'processing'
                      >,
                      job.currentStep,
                    )}
                  />
                ) : null}

                {job ? (
                  <div className="generate-status-copy">
                    <span>{getStatusDescription(job)}</span>
                    <span className="generate-status-copy__muted">
                      {`当前 revision：${job.revision}${
                        job.currentStep
                          ? ` · 当前轮次：${stageLabels[job.currentStep]}`
                          : ''
                      }`}
                    </span>
                    {job.lastError?.message ? (
                      <span className="generate-feedback-text">
                        {`失败原因：${job.lastError.message}`}
                      </span>
                    ) : null}
                    {job.status === 'done' && job.articleSlug ? (
                      <Link
                        href={`/reader/${job.articleSlug}`}
                        className="generate-link-pill generate-link-pill--accent"
                      >
                        打开生成结果
                      </Link>
                    ) : null}
                    {job.status === 'failed' && job.retryable ? (
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="generate-link-pill generate-link-pill--accent"
                      >
                        {isRetrying ? '继续生成中...' : '从失败处继续'}
                      </button>
                    ) : null}
                    {showDebugPanel ? (
                      <LlmDebugPanel
                        emptyLabel="本次任务尚未产生 LLM 调用日志"
                        key={job.llmDebug?.callId ?? `generate-${job.id}`}
                        record={job.llmDebug ?? null}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="generate-status-copy">
                    <span>任务完成后，结果会直接出现在这里。</span>
                    <span className="generate-status-copy__muted">
                      生成过程中可以保留当前页面，系统会自动同步每一轮的最新结果。
                    </span>
                  </div>
                )}
              </section>

              {job && visiblePreviews.length ? (
                <div className="generate-side-stack">
                  {visiblePreviews.map((stage) => (
                    <GenerateStagePreview
                      draft={liveDrafts[stage] ?? null}
                      key={`${job.id}-${stage}-${job.revision}`}
                      record={job.stages[stage]}
                      revision={job.revision}
                      stage={stage}
                    />
                  ))}
                </div>
              ) : null}
            </aside>
          </form>
        )}
      </section>
    </main>
  );
}
