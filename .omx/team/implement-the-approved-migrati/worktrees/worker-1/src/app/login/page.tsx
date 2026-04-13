'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintCode, setHintCode] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'verify'>('email');

  async function requestCode() {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/request-code', {
        body: JSON.stringify({ email }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });
      const payload = (await response.json()) as {
        devCode?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? '发送验证码失败。');
      }

      setHintCode(payload.devCode ?? null);
      setStep('verify');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '发送验证码失败。',
      );
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify', {
        body: JSON.stringify({ code, email }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? '验证码验证失败。');
      }

      router.push('/');
      router.refresh();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : '验证码验证失败。',
      );
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 20px 72px',
      }}
    >
      <section
        style={{
          maxWidth: 520,
          margin: '0 auto',
          display: 'grid',
          gap: 20,
          padding: 28,
          borderRadius: 28,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
            邮箱验证码登录
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            登录后再继续同步阅读进度
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            先输入邮箱领取验证码，再用验证码换取会话 cookie。后续会把阅读进度、生词和生成任务逐步切到账号体系。
          </p>
        </div>

        <label style={{ display: 'grid', gap: 8 }}>
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              border: '1px solid var(--border)',
              background: '#fff',
            }}
          />
        </label>

        {step === 'verify' ? (
          <label style={{ display: 'grid', gap: 8 }}>
            <span>验证码</span>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="6 位验证码"
              style={{
                padding: '14px 16px',
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: '#fff',
                letterSpacing: '0.32em',
              }}
            />
          </label>
        ) : null}

        {hintCode ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            开发环境验证码：<strong>{hintCode}</strong>
          </p>
        ) : null}

        {error ? (
          <p style={{ margin: 0, color: '#b42318' }}>{error}</p>
        ) : null}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {step === 'email' ? (
            <button
              type="button"
              onClick={requestCode}
              disabled={!email.trim() || isSending}
              style={{
                borderRadius: 999,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                cursor: email.trim() && !isSending ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                padding: '14px 20px',
              }}
            >
              {isSending ? '发送中…' : '发送验证码'}
            </button>
          ) : (
            <button
              type="button"
              onClick={verifyCode}
              disabled={!email.trim() || code.trim().length !== 6 || isVerifying}
              style={{
                borderRadius: 999,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                cursor:
                  email.trim() && code.trim().length === 6 && !isVerifying
                    ? 'pointer'
                    : 'not-allowed',
                fontWeight: 700,
                padding: '14px 20px',
              }}
            >
              {isVerifying ? '验证中…' : '完成登录'}
            </button>
          )}

          <Link href="/" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            返回首页
          </Link>
        </div>
      </section>
    </main>
  );
}
