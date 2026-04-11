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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const storage = window.localStorage;
    setDeviceId(getOrCreateDeviceId(storage));

    if (process.env.NODE_ENV !== 'test') {
      void loadClientSession().then((session) => {
        setIsAuthenticated(Boolean(session?.authenticated));
      });
    }
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
            LangChain + Prompt + LLM
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
            生成新的精读文章
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            你可以提交文章链接，或上传 .md、.txt、.docx 文件。系统会按当前
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
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>上传文件</span>
                <span style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                  把待处理的稿件放到工作台，系统会按当前 prompt 继续生成精读内容。
                </span>
              </div>

              <input
                id={fileInputId}
                type="file"
                accept=".md,.txt,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                aria-label="将稿件放入工作台"
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
                style={{
                  display: 'grid',
                  gap: 18,
                  padding: '22px 22px 20px',
                  borderRadius: 28,
                  cursor: 'pointer',
                  border: '1px solid rgba(114,75,35,0.14)',
                  background:
                    'linear-gradient(145deg, rgba(244,229,210,0.9) 0%, rgba(239,219,194,0.82) 100%)',
                  boxShadow:
                    '0 18px 40px rgba(114,75,35,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gap: 14,
                    padding: '24px 18px',
                    borderRadius: 22,
                    border: '1px dashed rgba(114,75,35,0.22)',
                    background:
                      'linear-gradient(180deg, rgba(255,252,247,0.98) 0%, rgba(250,243,233,0.98) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.78)',
                    textAlign: 'center',
                    justifyItems: 'center',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'relative',
                      width: 72,
                      height: 56,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        inset: '14px 8px 0 8px',
                        borderRadius: '14px 14px 18px 18px',
                        background: 'rgba(197,106,45,0.14)',
                        border: '1px solid rgba(197,106,45,0.16)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: '0 16px auto 16px',
                        height: 34,
                        borderRadius: 12,
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,237,220,0.96) 100%)',
                        border: '1px solid rgba(114,75,35,0.14)',
                        transform: 'rotate(-4deg)',
                        boxShadow: '0 8px 18px rgba(114,75,35,0.1)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 28,
                        width: 16,
                        height: 2,
                        borderRadius: 999,
                        background: 'rgba(197,106,45,0.48)',
                        boxShadow:
                          '0 7px 0 rgba(197,106,45,0.32), 0 14px 0 rgba(197,106,45,0.22)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 'clamp(1.15rem, 2vw, 1.35rem)',
                        fontWeight: 700,
                      }}
                    >
                      将稿件放入工作台
                    </span>
                    <span style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                      点击挑选文件，把原稿放到托盘中等待整理与生成。
                    </span>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 'fit-content',
                      minWidth: 136,
                      padding: '11px 18px',
                      borderRadius: 999,
                      background: 'rgba(197,106,45,0.12)',
                      border: '1px solid rgba(197,106,45,0.18)',
                      color: 'var(--editorial-ink)',
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    挑选稿件
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gap: 10,
                      padding: '16px 18px',
                      borderRadius: 20,
                      border: '1px solid rgba(114,75,35,0.1)',
                      background: 'rgba(255,252,247,0.72)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--editorial-ink)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                      }}
                    >
                      支持格式
                    </span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['.md', '.txt', '.docx'].map((extension) => (
                        <span
                          key={extension}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            border: '1px solid rgba(197,106,45,0.16)',
                            background: 'rgba(255,248,238,0.92)',
                            color: 'var(--editorial-ink)',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {extension}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: 8,
                      padding: '16px 18px',
                      borderRadius: 20,
                      border: `1px solid ${fileStatusTone.borderColor}`,
                      background: fileStatusTone.background,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--editorial-ink)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                      }}
                    >
                      当前状态
                    </span>
                    <strong style={{ fontSize: 16 }}>
                      {file ? '已放入托盘' : '等待放入稿件'}
                    </strong>
                    <span style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                      {file
                        ? file.name
                        : '选择文件后，会在这里显示稿件名称。'}
                    </span>
                  </div>
                </div>
              </label>

              <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                当前支持 .md、.txt、.docx；旧版 .doc 暂不支持。
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="submit"
              disabled={!canSubmit}
              className={isSubmitting ? 'llm-busy-button' : undefined}
              style={{
                borderRadius: 999,
                border: 'none',
                background: canSubmit
                  ? 'var(--accent)'
                  : 'rgba(197,106,45,0.32)',
                color: '#fff',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                padding: '14px 20px',
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="llm-busy-button__dot" aria-hidden="true" />
                  {uiCopy.generate.submitBusy}
                </>
              ) : (
                '开始生成'
              )}
            </button>
          {remaining !== null ? (
              <span style={{ color: 'var(--muted)' }}>
                今日剩余 {remaining} 次
              </span>
            ) : null}
            {!isAuthenticated && process.env.NODE_ENV !== 'test' ? (
              <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                先登录再生成
              </Link>
            ) : null}
          </div>

          {error ? (
            <p style={{ margin: 0, color: '#b42318' }}>{error}</p>
          ) : null}
        </form>

        {job ? (
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
            <strong>任务状态</strong>
            {job.status === 'pending' || job.status === 'processing' ? (
              <LlmLoadingCard {...getGenerateLoadingCopy(job.status)} />
            ) : (
              <StatusText status={job.status} />
            )}
            {job.errorMsg ? (
              <p style={{ margin: 0, color: '#b42318' }}>{job.errorMsg}</p>
            ) : null}
            {job.status === 'done' && job.articleSlug ? (
              <Link
                href={`/reader/${job.articleSlug}`}
                style={{ color: 'var(--accent)', fontWeight: 700 }}
              >
                打开生成的文章
              </Link>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
