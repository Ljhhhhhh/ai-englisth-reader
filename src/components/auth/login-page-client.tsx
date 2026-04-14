'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type LoginPageClientProps = {
  nextPath: string;
};

export function LoginPageClient({ nextPath }: LoginPageClientProps) {
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

      router.push(nextPath);
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
    <main className="login-page">
      <section className="login-page__frame">
        <div className="login-page__hero">
          <div className="login-page__hero-copy">
            <p className="login-page__eyebrow">Lexora Reading Sync</p>
            <h1 className="login-page__title">
              让你的精读进度，
              <br />
              接着往下走。
            </h1>
            <p className="login-page__description">
              登录后，阅读位置、生词和后续学习记录会跟着你的账号继续，不打断精读节奏。
            </p>
          </div>
        </div>

        <div className="login-page__form-panel">
          <div className="login-page__card">
            <div className="login-page__card-header">
              <p className="login-page__card-eyebrow">
                {step === 'email' ? '发送验证码' : '验证身份'}
              </p>
              <h2 className="login-page__card-title">
                {step === 'email' ? '输入邮箱' : '输入验证码'}
              </h2>
              <p className="login-page__card-description">
                {step === 'email'
                  ? '验证码将发送至你的邮箱。'
                  : `验证成功后返回 ${nextPath}。`}
              </p>
            </div>

            <label className="login-page__field">
              <span className="login-page__field-label">邮箱</span>
              <input
                aria-label="邮箱"
                className="login-page__input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            {step === 'verify' ? (
              <label className="login-page__field">
                <span className="login-page__field-label">验证码</span>
                <input
                  aria-label="验证码"
                  className="login-page__input login-page__input--code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="6 位验证码"
                />
              </label>
            ) : null}

            {hintCode ? (
              <p className="login-page__dev-code">开发环境验证码：{hintCode}</p>
            ) : null}

            {error ? <p className="login-page__error">{error}</p> : null}

            <div className="login-page__actions">
              {step === 'email' ? (
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={!email.trim() || isSending}
                  className="login-page__primary-button"
                >
                  {isSending ? '发送中…' : '发送验证码'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={!email.trim() || code.trim().length !== 6 || isVerifying}
                  className="login-page__primary-button"
                >
                  {isVerifying ? '验证中…' : '完成登录'}
                </button>
              )}

              <Link href="/" className="login-page__secondary-link">
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
