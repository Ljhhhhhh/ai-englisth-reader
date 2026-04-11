import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GeneratePage from '@/app/generate/page';

vi.mock('@/lib/device-id', () => ({
  getOrCreateDeviceId: () => 'device-1',
}));

describe('GeneratePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not warn when switching between url and file inputs', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(<GeneratePage />);

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example.com\/article/i), {
      target: { value: 'https://example.com/article' },
    });

    fireEvent.click(screen.getByRole('button', { name: '文件' }));

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'A component is changing a controlled input to be uncontrolled.',
      ),
    );

    consoleErrorSpy.mockRestore();
  });

  it('renders the study-room upload tray in file mode', () => {
    render(<GeneratePage />);

    fireEvent.click(screen.getByRole('button', { name: '文件' }));

    expect(screen.getByText(/将稿件放入工作台/i)).toBeInTheDocument();
    expect(screen.getByText(/支持格式/i)).toBeInTheDocument();
  });

  it('shows the selected file in the tray confirmation area', () => {
    render(<GeneratePage />);

    fireEvent.click(screen.getByRole('button', { name: '文件' }));

    fireEvent.change(screen.getByLabelText(/将稿件放入工作台/i), {
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'job-1',
        status: 'pending',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<GeneratePage />);

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example.com\/article/i), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }));

    await waitFor(() => {
      expect(screen.getByText(/文章已进入生成队列/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/编辑部收稿中/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
