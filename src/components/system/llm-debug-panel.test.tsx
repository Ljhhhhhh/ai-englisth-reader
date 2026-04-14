import { fireEvent, render, screen } from '@testing-library/react';
import { LlmDebugPanel } from './llm-debug-panel';

describe('LlmDebugPanel', () => {
  it('starts expanded for failed records', () => {
    render(
      <LlmDebugPanel
        emptyLabel="暂无日志"
        record={{
          callId: 'call-1',
          error: {
            message: 'LLM structured output parse failed.',
            stage: 'structured_output',
          },
          meta: {
            durationMs: 120,
          },
          rawOutput: {
            available: true,
            preview: '{"broken":true}',
            truncated: false,
          },
          status: 'failed',
          structuredResult: {
            data: null,
            status: 'parse_failed',
          },
          summary: {
            callType: 'generate',
            model: 'test-model',
            sourceRefLabel: 'example.com/.../article',
            sourceType: 'url',
            trigger: 'generate_page',
          },
          timestamp: '2026-04-14T00:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByText(/结构化结果 · parse_failed/i)).toBeInTheDocument();
    expect(screen.getByText(/LLM structured output parse failed/i)).toBeInTheDocument();
  });

  it('starts collapsed for successful records and can expand manually', () => {
    render(
      <LlmDebugPanel
        emptyLabel="暂无日志"
        record={{
          callId: 'call-2',
          error: null,
          meta: {
            durationMs: 80,
          },
          rawOutput: {
            available: false,
            preview: null,
            truncated: false,
          },
          status: 'success',
          structuredResult: {
            data: { ok: true },
            status: 'success',
          },
          summary: {
            callType: 'word',
            model: 'test-model',
            selectedText: 'clear',
            trigger: 'reader_panel',
          },
          timestamp: '2026-04-14T00:00:00.000Z',
        }}
      />,
    );

    expect(screen.queryByText(/结构化结果 · success/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /展开日志/i }));

    expect(screen.getByText(/结构化结果 · success/i)).toBeInTheDocument();
  });

  it('expands automatically when the latest record changes from success to failure', () => {
    const { rerender } = render(
      <LlmDebugPanel
        emptyLabel="暂无日志"
        record={{
          callId: 'call-2',
          error: null,
          meta: {
            durationMs: 80,
          },
          rawOutput: {
            available: false,
            preview: null,
            truncated: false,
          },
          status: 'success',
          structuredResult: {
            data: { ok: true },
            status: 'success',
          },
          summary: {
            callType: 'word',
            model: 'test-model',
            selectedText: 'clear',
            trigger: 'reader_panel',
          },
          timestamp: '2026-04-14T00:00:00.000Z',
        }}
      />,
    );

    expect(screen.queryByText(/结构化结果 · success/i)).not.toBeInTheDocument();

    rerender(
      <LlmDebugPanel
        emptyLabel="暂无日志"
        record={{
          callId: 'call-3',
          error: {
            message: 'route failed',
            stage: 'route',
          },
          meta: {
            durationMs: 95,
          },
          rawOutput: {
            available: true,
            preview: '{"ok":false}',
            truncated: false,
          },
          status: 'failed',
          structuredResult: {
            data: null,
            status: 'parse_failed',
          },
          summary: {
            callType: 'word',
            model: 'test-model',
            selectedText: 'clear',
            trigger: 'reader_panel',
          },
          timestamp: '2026-04-14T00:01:00.000Z',
        }}
      />,
    );

    expect(screen.getByText(/结构化结果 · parse_failed/i)).toBeInTheDocument();
    expect(screen.getByText(/route failed/i)).toBeInTheDocument();
  });
});
