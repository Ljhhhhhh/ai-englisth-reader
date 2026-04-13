import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock('@/features/auth/page-guard', () => ({
  redirectAuthenticatedUser: vi.fn().mockResolvedValue(undefined),
}));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it('returns to the requested page after a successful login', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          devCode: '123456',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(
      await LoginPage({
        searchParams: Promise.resolve({
          next: '/words?from=home',
        }),
      }),
    );

    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'reader@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));

    expect(await screen.findByLabelText('验证码')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('验证码'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: '完成登录' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/words?from=home');
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
