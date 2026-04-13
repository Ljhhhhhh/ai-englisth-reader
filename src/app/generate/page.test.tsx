import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/page-guard', () => ({
  requirePageSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
}));

import GeneratePage from '@/app/generate/page';

describe('GeneratePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the study-room upload tray in file mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 'user-1', email: 'reader@example.com' },
        }),
      }),
    );

    render(await GeneratePage());

    await screen.findByText(/reader@example.com/i);
    fireEvent.click(screen.getByRole('button', { name: '文件' }));

    expect(screen.getByText(/将稿件放入工作台/i)).toBeInTheDocument();
    expect(screen.getByText(/支持格式/i)).toBeInTheDocument();
  });

  it('shows the selected file in the tray confirmation area', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 'user-1', email: 'reader@example.com' },
        }),
      }),
    );

    render(await GeneratePage());

    await screen.findByText(/reader@example.com/i);
    fireEvent.click(screen.getByRole('button', { name: '文件' }));

    fireEvent.change(screen.getByLabelText(/将稿件放入工作台/i, { selector: 'input' }), {
      target: {
        files: [
          new File(['hello'], 'desk-notes.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ],
      },
    });

    expect(screen.getByText(/已放入托盘/i)).toBeInTheDocument();
    expect(screen.getByText('desk-notes.docx')).toBeInTheDocument();
  });

  it('shows the editorial loading card after a generation job is created', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: 'user-1', email: 'reader@example.com' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-1',
          status: 'pending',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(await GeneratePage());

    await screen.findByText(/reader@example.com/i);
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example.com\/article/i), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }));

    await waitFor(() => {
      expect(screen.getByText(/文章已进入生成队列/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/编辑部收稿中/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/generate',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
