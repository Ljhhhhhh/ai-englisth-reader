'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getOrCreateDeviceId } from '@/lib/device-id';

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

export default function GeneratePage() {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId(window.localStorage));
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
    if (!deviceId || isSubmitting) {
      return false;
    }

    return mode === 'url' ? Boolean(url.trim()) : Boolean(file);
  }, [deviceId, file, isSubmitting, mode, url]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deviceId) {
      setError('设备标识尚未准备好，请稍后再试。');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setJob(null);

    try {
      const formData = new FormData();
      formData.set('deviceId', deviceId);

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
              href="/words"
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
            <label style={{ display: 'grid', gap: 8 }}>
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
            <label style={{ display: 'grid', gap: 8 }}>
              <span>上传文件</span>
              <input
                type="file"
                accept=".md,.txt,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                当前支持 .md、.txt、.docx；旧版 .doc 暂不支持。
              </span>
            </label>
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
              {isSubmitting ? '提交中...' : '开始生成'}
            </button>
            {remaining !== null ? (
              <span style={{ color: 'var(--muted)' }}>
                今日剩余 {remaining} 次
              </span>
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
            <StatusText status={job.status} />
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
