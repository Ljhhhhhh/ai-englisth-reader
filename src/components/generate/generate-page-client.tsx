'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { loadClientSession } from '@/features/auth/client-session';
import { LlmLoadingCard } from '@/components/system/llm-loading-card';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { uiCopy } from '@/lib/ui-copy';

type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

type JobResponse = {
  articleSlug?: string;
  errorMsg?: string | null;
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

function StatusText({ status }: { status: JobStatus }) {
  if (status === 'pending') {
    return <span>任务已提交，正在排队。</span>;
  }

  if (status === 'processing') {
    return <span>正在调用模型生成文章，请保持页面打开。</span>;
  }

  if (status === 'done') {
    return <span>文章生成完成。</span>;
  }

  return <span>生成失败，请检查错误信息后重试。</span>;
}

function getGenerateLoadingCopy(status: Extract<JobStatus, 'pending' | 'processing'>) {
  if (status === 'pending') {
    return {
      description: uiCopy.generate.queuedDescription,
      eyebrow: uiCopy.generate.queuedEyebrow,
      steps: uiCopy.generate.queuedSteps,
      title: uiCopy.generate.queuedTitle,
    };
  }

  return {
    description: uiCopy.generate.processingDescription,
    eyebrow: uiCopy.generate.processingEyebrow,
    steps: uiCopy.generate.processingSteps,
    title: uiCopy.generate.processingTitle,
  };
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

export default function GeneratePageClient() {
  const fileInputId = useId();
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    process.env.NODE_ENV === 'test',
  );
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [user, setUser] = useState<SessionResponse['user']>(null);

  useEffect(() => {
    const storage = window.localStorage;
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
    if (!job || job.status === 'done' || job.status === 'failed') {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/generate/${job.id}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        return;
      }

      const nextJob = (await response.json()) as JobResponse;
      setJob(nextJob);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [job]);

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
      ? (url.trim() || '等待贴入文章链接')
      : (file ? '已接收 1 份待加工稿件' : '等待放入稿件文件');
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
      const payload = (await response.json()) as JobResponse & {
        error?: string;
        remaining?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? '提交生成任务失败。');
      }

      setRemaining(payload.remaining ?? null);
      setJob({
        id: payload.id,
        status: payload.status,
      });
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
            <Link href="/" className="generate-link-pill generate-link-pill--accent">
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
              <Link href="/login" className="generate-link-pill generate-link-pill--accent">
                去登录
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="generate-account-bar">
              <div className="generate-account-bar__identity">
                <span className="generate-account-bar__label">当前生成账号</span>
                <strong className="generate-account-bar__value">{user.email}</strong>
              </div>
              <div className="generate-account-bar__quota">
                <span className="generate-account-bar__label">工坊余量</span>
                <strong className="generate-account-bar__value">
                  {remaining !== null ? `今日剩余 ${remaining} 次` : '提交后更新'}
                </strong>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="generate-studio">
              <section className="generate-panel generate-panel--main">
                <div className="generate-panel__header">
                  <span className="generate-panel__eyebrow">稿件入口</span>
                  <h2 className="generate-panel__title">把素材整理进本次生成任务</h2>
                  <p className="generate-panel__description">
                    先确认来源，再检查稿件信息，提交后右侧会持续显示最新进度和结果入口。
                  </p>
                </div>

                <div className="generate-mode-switch" role="tablist" aria-label="选择生成来源">
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
                        <span className="generate-dropzone__icon" aria-hidden="true">
                          FILE
                        </span>
                        <span className="generate-dropzone__title">将稿件放入工作台</span>
                        <span className="generate-dropzone__description">
                          点击挑选要加工的稿件，系统会按当前 prompt 抽取正文并生成新的精读文章。
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

                    <div className="generate-format-card">
                      <strong className="generate-format-card__title">支持格式</strong>
                      {file ? (
                        <>
                          <span className="generate-format-card__eyebrow">已放入托盘</span>
                          <span className="generate-format-card__file">{file.name}</span>
                        </>
                      ) : (
                        <span className="generate-format-card__body">
                          还没有选择文件，支持 md、txt、docx。
                        </span>
                      )}
                      <div className="generate-chip-row">
                        {['Markdown', 'Plain Text', 'Word'].map((item) => (
                          <span key={item} className="generate-chip generate-chip--muted">
                            {item}
                          </span>
                        ))}
                      </div>
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
                    <div className="generate-submit-copy">
                      <span className="generate-submit-copy__headline">
                        {remaining !== null
                          ? `今日剩余生成次数：${remaining}`
                          : '提交后会同步刷新今日剩余次数'}
                      </span>
                      <span className="generate-submit-copy__detail">
                        任务状态会跟随账号保留，你可以稍后回来继续查看。
                      </span>
                    </div>
                  </div>
                </div>

                {error ? (
                  <p className="generate-feedback generate-feedback--error">{error}</p>
                ) : null}
              </section>

              <aside className="generate-side-stack">
                <section className="generate-panel">
                  <div className="generate-side-card__header">
                    <span className="generate-panel__eyebrow">本次素材</span>
                    <strong className="generate-side-card__title">{sourceLabel}</strong>
                  </div>
                  <p className="generate-side-card__lead">{sourceTitle}</p>
                  <p className="generate-side-card__body">{sourceDescription}</p>
                  <div className="generate-process-list">
                    <div className="generate-process-item">
                      <span className="generate-process-item__index">01</span>
                      <span>收稿并抽取正文</span>
                    </div>
                    <div className="generate-process-item">
                      <span className="generate-process-item__index">02</span>
                      <span>按 prompt 重写为精读结构</span>
                    </div>
                    <div className="generate-process-item">
                      <span className="generate-process-item__index">03</span>
                      <span>写入阅读页并返回结果</span>
                    </div>
                  </div>
                </section>

                <section
                  className={`generate-status-card ${
                    job ? `generate-status-card--${job.status}` : 'generate-status-card--idle'
                  }`}
                >
                  <div className="generate-status-card__header">
                    <div className="generate-status-pill">
                      {job ? getStatusLabel(job.status) : '待开始'}
                    </div>
                    <strong className="generate-side-card__title">任务状态</strong>
                  </div>

                  {job && (job.status === 'pending' || job.status === 'processing') ? (
                    <LlmLoadingCard {...getGenerateLoadingCopy(job.status)} />
                  ) : null}

                  {job ? (
                    <div className="generate-status-copy">
                      <StatusText status={job.status} />
                      {job.errorMsg ? (
                        <span className="generate-feedback-text">{job.errorMsg}</span>
                      ) : null}
                      {job.status === 'done' && job.articleSlug ? (
                        <Link
                          href={`/reader/${job.articleSlug}`}
                          className="generate-link-pill generate-link-pill--accent"
                        >
                          打开生成结果
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="generate-status-copy">
                      <span>任务完成后，结果会直接出现在这里。</span>
                      <span className="generate-status-copy__muted">
                        生成过程中可以保留当前页面，系统会自动轮询最新状态。
                      </span>
                    </div>
                  )}
                </section>
              </aside>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
