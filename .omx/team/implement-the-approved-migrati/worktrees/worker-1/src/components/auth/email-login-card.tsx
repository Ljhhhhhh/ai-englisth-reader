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

  return (
    <section
      style={{
        display: 'grid',
        gap: 14,
        padding: 24,
        borderRadius: 24,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
        账号同步
      </p>
      {isLoadingSession ? (
        <p style={{ margin: 0, color: 'var(--muted)' }}>正在检查登录状态...</p>
      ) : user ? (
        <>
          <h2 style={{ margin: 0 }}>{user.email}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
            {uiCopy.auth.authenticatedHint}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              style={{
                width: 'fit-content',
                padding: '12px 18px',
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--foreground)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isLoggingOut ? '退出中...' : uiCopy.auth.logout}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 style={{ margin: 0 }}>{uiCopy.auth.signedOutTitle}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
            {uiCopy.auth.signedOutDescription}
          </p>
          <label style={{ display: 'grid', gap: 8 }}>
            <span>{uiCopy.auth.emailLabel}</span>
            <input
              aria-label={uiCopy.auth.emailLabel}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="reader@example.com"
              style={{
                padding: '14px 16px',
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: '#fff',
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void handleRequestCode()}
              disabled={isRequestingCode || !email.trim()}
              style={{
                width: 'fit-content',
                padding: '12px 18px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isRequestingCode ? uiCopy.auth.sendingCode : uiCopy.auth.requestCode}
            </button>
          </div>

          {showCodeForm ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                {uiCopy.auth.codeHint}
              </p>
              <label style={{ display: 'grid', gap: 8 }}>
                <span>{uiCopy.auth.codeLabel}</span>
                <input
                  aria-label={uiCopy.auth.codeLabel}
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    background: '#fff',
                  }}
                />
              </label>
              {devCode ? (
                <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
                  {uiCopy.auth.devCodePreview(devCode)}
                </p>
              ) : null}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => void handleVerify()}
                  disabled={isVerifying || code.trim().length !== 6}
                  style={{
                    width: 'fit-content',
                    padding: '12px 18px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isVerifying ? uiCopy.auth.verifying : uiCopy.auth.verify}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p style={{ margin: 0, color: '#9b2c2c' }}>{error}</p>
      ) : null}
    </section>
  );
}
