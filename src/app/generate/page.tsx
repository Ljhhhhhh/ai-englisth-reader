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

export default function GeneratePage() {
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

  const fileStatusTone = file
    ? {
        background:
          'linear-gradient(180deg, rgba(255,248,240,0.96) 0%, rgba(249,239,225,0.98) 100%)',
        borderColor: 'rgba(197,106,45,0.26)',
      }
    : {
        background:
          'linear-gradient(180deg, rgba(255,253,248,0.94) 0%, rgba(248,243,234,0.98) 100%)',
        borderColor: 'rgba(114,75,35,0.12)',
      };

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
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 20px 72px',
      }}
    >
      <section style={{ display: 'grid', gap: 24 }}>
        <div
          style={{
            display: 'grid',
            gap: 14,
            padding: '32px 28px',
            borderRadius: 32,
            background:
              'linear-gradient(135deg, rgba(255,248,238,0.96) 0%, rgba(249,235,217,0.96) 100%)',
            border: '1px solid var(--border)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
            言序内容工坊
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
            生成新的精读文章
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            你可以提交文章链接，或上传 .md、.txt、.docx 文件。言序会按当前
            prompt 生成精读 JSON，并自动写入阅读内容目录。
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              返回首页
            </Link>
            <Link
              href="/words?from=home"
              style={{ color: 'var(--accent)', fontWeight: 600 }}
            >
              查看生词本
            </Link>
          </div>
        </div>

        {isLoadingSession ? (
          <section
            style={{
              display: 'grid',
              gap: 12,
              padding: 24,
              borderRadius: 24,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--muted)' }}>正在确认登录状态...</p>
          </section>
        ) : !user ? (
          <section
            style={{
              display: 'grid',
              gap: 12,
              padding: 24,
              borderRadius: 24,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <h2 style={{ margin: 0 }}>请先登录账号</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              生成任务已经切到账号体系。登录后，生成次数、任务状态和后续产物都会跟随你的账号。
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/login"
                style={{
                  width: 'fit-content',
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                去登录
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section
              style={{
                display: 'grid',
                gap: 8,
                padding: 20,
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
                当前生成账号
              </p>
              <strong>{user.email}</strong>
            </section>

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'grid',
                gap: 20,
                padding: 24,
                borderRadius: 24,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setMode('url')}
                  style={{
                    borderRadius: 999,
                    border: mode === 'url' ? 'none' : '1px solid var(--border)',
                    background: mode === 'url' ? 'var(--accent)' : 'transparent',
                    color: mode === 'url' ? '#fff' : 'var(--foreground)',
                    cursor: 'pointer',
                    padding: '10px 16px',
                  }}
                >
                  链接
                </button>
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  style={{
                    borderRadius: 999,
                    border: mode === 'file' ? 'none' : '1px solid var(--border)',
                    background: mode === 'file' ? 'var(--accent)' : 'transparent',
                    color: mode === 'file' ? '#fff' : 'var(--foreground)',
                    cursor: 'pointer',
                    padding: '10px 16px',
                  }}
                >
                  文件
                </button>
              </div>

              {mode === 'url' ? (
                <label key="url-input" style={{ display: 'grid', gap: 8 }}>
                  <span>文章链接</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com/article"
                    style={{
                      padding: '14px 16px',
                      borderRadius: 16,
                      border: '1px solid var(--border)',
                      background: '#fff',
                    }}
                  />
                </label>
              ) : (
                <div key="file-input" style={{ display: 'grid', gap: 14 }}>
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".md,.txt,.docx"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setFile(nextFile);
                    }}
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      padding: 0,
                      margin: -1,
                      overflow: 'hidden',
                      clip: 'rect(0, 0, 0, 0)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  />
                  <label
                    htmlFor={fileInputId}
                    aria-label="将稿件放入工作台"
                    style={{
                      display: 'grid',
                      gap: 12,
                      padding: '22px 20px',
                      borderRadius: 22,
                      border: `1px dashed ${fileStatusTone.borderColor}`,
                      background: fileStatusTone.background,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700 }}>
                      将稿件放入工作台
                    </span>
                    <span style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                      点击挑选要加工的稿件，系统会按当前 prompt 抽取正文并生成新的精读文章。
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['.md', '.txt', '.docx'].map((item) => (
                        <span
                          key={item}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.75)',
                            border: '1px solid rgba(114,75,35,0.12)',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gap: 6,
                      padding: '16px 18px',
                      borderRadius: 18,
                      border: `1px solid ${fileStatusTone.borderColor}`,
                      background: fileStatusTone.background,
                    }}
                  >
                    <strong>支持格式</strong>
                    {file ? (
                      <>
                        <span>已放入托盘</span>
                        <span>{file.name}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>
                        还没有选择文件，支持 md、txt、docx。
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    borderRadius: 999,
                    border: 'none',
                    background: canSubmit ? 'var(--accent)' : 'rgba(197,106,45,0.32)',
                    color: '#fff',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                    padding: '14px 20px',
                  }}
                >
                  {isSubmitting ? uiCopy.generate.submitBusy : '开始生成'}
                </button>
                {remaining !== null ? (
                  <span style={{ color: 'var(--muted)' }}>
                    今日剩余生成次数：{remaining}
                  </span>
                ) : null}
              </div>
            </form>
          </>
        )}

        {error ? (
          <p style={{ margin: 0, color: '#b42318' }}>{error}</p>
        ) : null}

        {job ? (
          <section
            style={{
              display: 'grid',
              gap: 16,
              padding: 24,
              borderRadius: 24,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            {(job.status === 'pending' || job.status === 'processing') ? (
              <LlmLoadingCard {...getGenerateLoadingCopy(job.status)} />
            ) : null}
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>任务状态</strong>
              <StatusText status={job.status} />
              {job.errorMsg ? (
                <span style={{ color: '#b42318' }}>{job.errorMsg}</span>
              ) : null}
              {job.status === 'done' && job.articleSlug ? (
                <Link href={`/reader/${job.articleSlug}`}>打开生成结果</Link>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
