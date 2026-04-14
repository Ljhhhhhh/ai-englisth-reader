'use client';

import { useEffect, useState } from 'react';

import { uiCopy } from '@/lib/ui-copy';

type SessionUser = {
  email: string;
  id: string;
};

type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

type RequestCodeResponse = {
  devCode?: string;
  error?: string;
  ok?: boolean;
};

type VerifyResponse = {
  error?: string;
  ok?: boolean;
  user?: SessionUser;
};

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

const syncBenefits = ['进度同步', '生词留存', '账号接续'] as const;

const authSteps = ['填写邮箱', '验证身份', '同步完成'] as const;

export function EmailLoginCard() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });
        const payload = await readJson<SessionResponse>(response);

        if (!isActive) {
          return;
        }

        if (response.ok && payload.authenticated && payload.user) {
          setUser(payload.user);
          setEmail(payload.user.email);
          setShowCodeForm(false);
        }
      } catch {
        if (isActive) {
          setError(uiCopy.auth.errorFallback);
        }
      } finally {
        if (isActive) {
          setIsLoadingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleRequestCode() {
    setIsRequestingCode(true);
    setError(null);
    setDevCode(null);

    try {
      const normalizedEmail = email.trim();
      const response = await fetch('/api/auth/request-code', {
        body: JSON.stringify({ email: normalizedEmail }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const payload = await readJson<RequestCodeResponse>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? uiCopy.auth.errorFallback);
      }

      setEmail(normalizedEmail);
      setShowCodeForm(true);
      setDevCode(payload.devCode ?? null);
      setCode('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : uiCopy.auth.errorFallback,
      );
    } finally {
      setIsRequestingCode(false);
    }
  }

  async function handleVerify() {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify', {
        body: JSON.stringify({
          code: code.trim(),
          email: email.trim(),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const payload = await readJson<VerifyResponse>(response);

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? uiCopy.auth.errorFallback);
      }

      setUser(payload.user);
      setShowCodeForm(false);
      setDevCode(null);
      setCode('');
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : uiCopy.auth.errorFallback,
      );
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      const payload = await readJson<{ error?: string; ok?: boolean }>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? uiCopy.auth.errorFallback);
      }

      setUser(null);
      setShowCodeForm(false);
      setCode('');
      setDevCode(null);
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : uiCopy.auth.errorFallback,
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  const currentStep = user ? 2 : showCodeForm ? 1 : 0;
  const panelEyebrow = isLoadingSession
    ? '同步校验中'
    : user
      ? '账号已连接'
      : showCodeForm
        ? '验证身份'
        : '准备连接';
  const panelTitle = isLoadingSession
    ? '正在确认登录状态'
    : user
      ? '账号已连接'
      : showCodeForm
        ? '输入验证码'
        : '邮箱登录';
  const panelDescription = isLoadingSession
    ? '正在恢复这台设备上的会话。'
    : user
      ? uiCopy.auth.authenticatedHint
      : showCodeForm
        ? '输入 6 位验证码后继续。'
        : '同步阅读进度与生词。';

  return (
    <section className="email-login-card" aria-label="账号同步">
      <div className="email-login-card__shell">
        <div className="email-login-card__story">
          <div className="email-login-card__story-header">
            <p className="email-login-card__eyebrow">账号同步</p>
            <h2 className="email-login-card__headline">
              登录后，
              <br />
              阅读记录跟你走。
            </h2>
            <p className="email-login-card__lede">只保留真正需要的同步能力。</p>
          </div>

          <div className="email-login-card__benefits" aria-label="登录权益">
            {syncBenefits.map((benefit) => (
              <span key={benefit} className="email-login-card__benefit">
                <span className="email-login-card__benefit-title">{benefit}</span>
              </span>
            ))}
          </div>

          <ol className="email-login-card__steps" aria-label="登录进度">
            {authSteps.map((step, index) => (
              <li
                key={step}
                className="email-login-card__step"
                data-active={index === currentStep}
                data-complete={index < currentStep}
              >
                <span className="email-login-card__step-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="email-login-card__step-label">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="email-login-card__panel">
          <div className="email-login-card__panel-frame">
            <div className="email-login-card__panel-header">
              <p className="email-login-card__panel-eyebrow">{panelEyebrow}</p>
              <h3 className="email-login-card__panel-title">{panelTitle}</h3>
              <p className="email-login-card__panel-description">
                {panelDescription}
              </p>
            </div>

            {isLoadingSession ? (
              <div className="email-login-card__loading" aria-live="polite">
                <div className="email-login-card__loading-line email-login-card__loading-line--long" />
                <div className="email-login-card__loading-line email-login-card__loading-line--medium" />
                <div className="email-login-card__loading-line email-login-card__loading-line--short" />
              </div>
            ) : user ? (
              <div className="email-login-card__authenticated">
                <div className="email-login-card__identity">
                  <p className="email-login-card__identity-label">当前邮箱</p>
                  <p className="email-login-card__identity-value">{user.email}</p>
                </div>
                <div className="email-login-card__status-grid">
                  <div className="email-login-card__status-chip">进度可同步</div>
                  <div className="email-login-card__status-chip">生词可留存</div>
                  <div className="email-login-card__status-chip">会话已建立</div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="email-login-card__secondary-button"
                >
                  {isLoggingOut ? '退出中...' : uiCopy.auth.logout}
                </button>
              </div>
            ) : (
              <div className="email-login-card__form-stack">
                <label className="email-login-card__field">
                  <span className="email-login-card__field-label">
                    {uiCopy.auth.emailLabel}
                  </span>
                  <input
                    aria-label={uiCopy.auth.emailLabel}
                    className="email-login-card__input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="reader@example.com"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleRequestCode()}
                  disabled={isRequestingCode || !email.trim()}
                  className="email-login-card__primary-button"
                >
                  {isRequestingCode ? uiCopy.auth.sendingCode : uiCopy.auth.requestCode}
                </button>

                {showCodeForm ? (
                  <div className="email-login-card__verification">
                    <div className="email-login-card__verification-copy">
                      <p className="email-login-card__verification-kicker">
                        第 2 步
                      </p>
                      <p className="email-login-card__verification-text">
                        验证码已发送至邮箱。
                      </p>
                    </div>

                    <label className="email-login-card__field">
                      <span className="email-login-card__field-label">
                        {uiCopy.auth.codeLabel}
                      </span>
                      <input
                        aria-label={uiCopy.auth.codeLabel}
                        className="email-login-card__input email-login-card__input--code"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="123456"
                      />
                    </label>

                    {devCode ? (
                      <p className="email-login-card__dev-code">
                        {uiCopy.auth.devCodePreview(devCode)}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleVerify()}
                      disabled={isVerifying || code.trim().length !== 6}
                      className="email-login-card__primary-button"
                    >
                      {isVerifying ? uiCopy.auth.verifying : uiCopy.auth.verify}
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {error ? (
              <p className="email-login-card__error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
