import { fireEvent, render, screen } from '@testing-library/react';
import { GenerateStagePreview } from '@/components/generate/generate-stage-preview';

describe('GenerateStagePreview', () => {
  it('renders streaming JSON drafts as an explorable tree inspector', () => {
    render(
      <GenerateStagePreview
        draft={{
          attempt: 1,
          status: 'streaming',
          text: `\`\`\`json
{
  "chinese_title": "在稳定上下文里学习",
  "list_summary_zh": [
    "理解核心观点",
    "保留关键词汇"
  ],
  "language_evolution": {
    "target_structure": "once-clause",
    "explanation": "用 once 引导条件，让句子更精确。"
  }
}
\`\`\``,
          updatedAt: '2026-04-14T00:00:02.000Z',
        }}
        record={{ status: 'running' }}
        revision={1}
        stage="translation"
      />,
    );

    expect(screen.getByText('JSON 草稿')).toBeInTheDocument();
    expect(screen.getAllByText('object').length).toBeGreaterThan(0);
    expect(screen.getByText('3 fields')).toBeInTheDocument();
    expect(screen.getByText('中文标题')).toBeInTheDocument();
    expect(screen.getByText('"在稳定上下文里学习"')).toBeInTheDocument();
    expect(screen.getByText('array')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /切换语言升级/i }),
    ).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: /切换语言升级/i }));

    expect(
      screen.getByRole('button', { name: /切换语言升级/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('目标结构')).toBeInTheDocument();
    expect(screen.getByText('"once-clause"')).toBeInTheDocument();
    expect(screen.queryByText(/^\{$/)).not.toBeInTheDocument();
  });
});
