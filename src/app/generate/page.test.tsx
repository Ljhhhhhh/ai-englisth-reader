import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/features/auth/page-guard', () => ({
  requirePageSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
}));

import GeneratePage from '@/app/generate/page';

type MockJobSnapshot = {
  articleSlug: string | null;
  currentStep: 'english' | 'vocabulary' | 'grammar' | 'translation' | 'finalize' | null;
  id: string;
  lastError: { message: string; stage?: string } | null;
  retryable: boolean;
  revision: number;
  stages: {
    english: { data?: Record<string, unknown>; error?: { message: string }; status: string };
    finalize: { data?: Record<string, unknown>; error?: { message: string }; status: string };
    grammar: { data?: Record<string, unknown>; error?: { message: string }; status: string };
    translation: { data?: Record<string, unknown>; error?: { message: string }; status: string };
    vocabulary: { data?: Record<string, unknown>; error?: { message: string }; status: string };
  };
  status: 'pending' | 'processing' | 'done' | 'failed';
};

type MockStageDraft = {
  attempt: number;
  jobId: string;
  stage: 'english' | 'vocabulary' | 'grammar' | 'translation' | 'finalize';
  status: 'streaming' | 'completed' | 'cleared';
  text: string;
  updatedAt: string;
};

class MockEventSource {
  static instances: MockEventSource[] = [];

  listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  readyState = 0;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    const existing = this.listeners.get(type) ?? new Set();
    existing.add(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = 2;
  }

  emit(type: string, payload: unknown) {
    const event = new MessageEvent(type, {
      data: JSON.stringify(payload),
    });
    this.listeners.get(type)?.forEach((listener) => listener(event));
    if (type === 'message' && this.onmessage) {
      this.onmessage(event);
    }
  }
}

function createSnapshot(overrides: Partial<MockJobSnapshot> = {}): MockJobSnapshot {
  return {
    articleSlug: null,
    currentStep: null,
    id: 'job-1',
    lastError: null,
    retryable: false,
    revision: 0,
    stages: {
      english: { status: 'pending' },
      finalize: { status: 'pending' },
      grammar: { status: 'pending' },
      translation: { status: 'pending' },
      vocabulary: { status: 'pending' },
    },
    status: 'pending',
    ...overrides,
  };
}

describe('GeneratePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
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

    await screen.findByText(/稿件入口/i);
    fireEvent.click(screen.getByRole('button', { name: '文件' }));

    expect(screen.getByText(/将稿件放入工作台/i)).toBeInTheDocument();
    expect(screen.getByText('.docx')).toBeInTheDocument();
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

    await screen.findByText(/稿件入口/i);
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

    expect(screen.getByText(/已接收 1 份待加工稿件/i)).toBeInTheDocument();
    expect(
      screen.getByText(/文件已经放入工作台，生成时会按当前 prompt 读取内容并重写为精读文章。/i),
    ).toBeInTheDocument();
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

    await screen.findByText(/稿件入口/i);
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

  it('hides the source cards once generation starts', async () => {
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

    await screen.findByText(/稿件入口/i);
    expect(screen.getByText('稿件入口')).toBeInTheDocument();
    expect(screen.getByText('本次素材')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example.com\/article/i), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }));

    await waitFor(() => {
      expect(screen.getByText(/文章已进入生成队列/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('稿件入口')).not.toBeInTheDocument();
    expect(screen.queryByText('本次素材')).not.toBeInTheDocument();
  });

  it('renders stage previews from SSE snapshots as each round succeeds', async () => {
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

    await screen.findByText(/稿件入口/i);
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example.com\/article/i), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const stream = MockEventSource.instances[0];

    await act(async () => {
      stream.emit(
        'snapshot',
        createSnapshot({
          currentStep: 'english',
          revision: 1,
          stages: {
            english: {
              data: {
                feynman_summary:
                  'English article preview about spaced repetition and reading rhythm.',
              },
              status: 'succeeded',
            },
            finalize: { status: 'pending' },
            grammar: { status: 'pending' },
            translation: { status: 'pending' },
            vocabulary: { status: 'pending' },
          },
          status: 'processing',
        }),
      );
    });

    await screen.findByText(/english article preview/i);

    await act(async () => {
      stream.emit(
        'snapshot',
        createSnapshot({
          currentStep: 'translation',
          revision: 4,
          stages: {
            english: {
              data: {
                feynman_summary:
                  'English article preview about spaced repetition and reading rhythm.',
              },
              status: 'succeeded',
            },
            finalize: { status: 'pending' },
            grammar: {
              data: {
                language_evolution: {
                  after: 'It is easier to retain the lesson once the context is stable.',
                  before: 'You can remember it more easily.',
                  keyPoint: 'Use once-clause to add condition and precision.',
                },
              },
              status: 'succeeded',
            },
            translation: {
              data: {
                chinese_title: '在稳定上下文里学习',
                chinese_translation: '当上下文稳定时，读者更容易记住真正重要的内容。',
                list_summary_zh: ['理解核心观点', '保留关键词汇'],
              },
              status: 'succeeded',
            },
            vocabulary: {
              data: {
                growth_vocabulary: ['retain', 'contextualize'],
                high_frequency_phrases: ['in context', 'hold attention'],
              },
              status: 'succeeded',
            },
          },
          status: 'processing',
        }),
      );
    });

    await screen.findByText('retain');
    expect(screen.getByText(/在稳定上下文里学习/i)).toBeInTheDocument();
    expect(screen.getByText(/use once-clause/i)).toBeInTheDocument();
  });

  it('renders live draft text before the durable stage snapshot lands', async () => {
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

    await screen.findByText(/稿件入口/i);
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example.com\/article/i), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const stream = MockEventSource.instances[0];

    await act(async () => {
      stream.emit(
        'snapshot',
        createSnapshot({
          currentStep: 'english',
          revision: 1,
          status: 'processing',
        }),
      );
      stream.emit('stage_draft', {
        attempt: 1,
        jobId: 'job-1',
        stage: 'english',
        status: 'streaming',
        text: 'Draft article opening before completion.',
        updatedAt: '2026-04-14T00:00:02.000Z',
      } satisfies MockStageDraft);
    });

    await screen.findByText(/Draft article opening before completion/i);
    expect(screen.getByText(/实时生成中/i)).toBeInTheDocument();

    await act(async () => {
      stream.emit(
        'snapshot',
        createSnapshot({
          currentStep: 'english',
          revision: 2,
          stages: {
            english: {
              data: {
                feynman_summary: 'Final english article after stage success.',
              },
              status: 'succeeded',
            },
            finalize: { status: 'pending' },
            grammar: { status: 'pending' },
            translation: { status: 'pending' },
            vocabulary: { status: 'pending' },
          },
          status: 'processing',
        }),
      );
    });

    await screen.findByText(/Final english article after stage success/i);
  });

  it('keeps successful previews visible when a later stage fails and retries the same job', async () => {
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
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-1',
          status: 'processing',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(await GeneratePage());

    await screen.findByText(/稿件入口/i);
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example.com\/article/i), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const firstStream = MockEventSource.instances[0];

    await act(async () => {
      firstStream.emit(
        'snapshot',
        createSnapshot({
          currentStep: 'grammar',
          revision: 3,
          stages: {
            english: {
              data: {
                feynman_summary: 'English preview survives the failure.',
              },
              status: 'succeeded',
            },
            finalize: { status: 'pending' },
            grammar: {
              error: { message: '语法讲解暂时生成失败。' },
              status: 'failed',
            },
            translation: { status: 'pending' },
            vocabulary: {
              data: {
                growth_vocabulary: ['retain'],
                high_frequency_phrases: ['stay with the text'],
              },
              status: 'succeeded',
            },
          },
          lastError: {
            message: '语法讲解暂时生成失败。',
            stage: 'grammar',
          },
          retryable: true,
          status: 'failed',
        }),
      );
    });

    await screen.findByText(/english preview survives the failure/i);
    expect(
      screen.getByText(/第三轮 · 语法讲解生成失败，可从当前轮次继续。/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/失败原因：语法讲解暂时生成失败。/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '从失败处继续' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '从失败处继续' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        '/api/generate/job-1/retry',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
