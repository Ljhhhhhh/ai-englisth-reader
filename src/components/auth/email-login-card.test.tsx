import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { EmailLoginCard } from './email-login-card';

describe('EmailLoginCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lets an unauthenticated reader request a code, verify it, and log out', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false, user: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          devCode: '123456',
          expiresAt: '2026-04-11T14:00:00.000Z',
          ok: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: { email: 'reader@example.com', id: 'user-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<EmailLoginCard />);

    expect(await screen.findByLabelText(/登录邮箱/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/登录邮箱/i), {
      target: { value: ' Reader@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /发送验证码/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/auth/request-code',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByLabelText(/6 位验证码/i)).toBeInTheDocument();
    expect(screen.getByText(/开发环境验证码：123456/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/6 位验证码/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /验证并登录/i }));

    expect(await screen.findByText(/reader@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /退出登录/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /退出登录/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        '/api/auth/logout',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByLabelText(/登录邮箱/i)).toBeInTheDocument();
  });

  it('shows the active session when the reader is already authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { email: 'reader@example.com', id: 'user-1' },
        }),
      }),
    );

    render(<EmailLoginCard />);

    expect(await screen.findByText(/reader@example.com/i)).toBeInTheDocument();
    expect(
      screen.getByText(/已登录，可同步阅读进度与生词/i),
    ).toBeInTheDocument();
  });
});
