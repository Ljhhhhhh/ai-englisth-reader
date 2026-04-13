import { render, screen } from '@testing-library/react';
import { ExplainPanelContent } from '@/components/reader/explain-panel-content';

describe('ExplainPanelContent', () => {
  it('prioritizes memory cues in the word explanation panel', () => {
    render(
      <ExplainPanelContent
        onRetry={() => {}}
        onToggleSave={() => {}}
        saveEnabled
        saved={false}
        state={{
          status: 'success',
          data: {
            mode: 'word',
            selectedText: 'panic',
            meaning: '慌乱',
            contextMeaning: '这里指读者读不懂时的慌乱感。',
            explanation: '先别把 panic 理解成严重恐慌，这里更像阅读被打断时的紧张。',
            memoryType: '场景助记',
            memoryHook: '看到陌生句子先别 panic，文中说的是支持能把这种慌乱降下来。',
            usageExample: 'She tried not to panic when the deadline moved forward.',
            sourceSentence:
              'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
          },
        }}
      />,
    );

    expect(screen.getByText(/助记讲解/i)).toBeInTheDocument();
    expect(screen.getByText(/场景助记 · 看到陌生句子先别 panic/i)).toBeInTheDocument();
    expect(screen.getByText(/常用场景/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'She tried not to panic when the deadline moved forward.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/放回原句怎么理解/i)).toBeInTheDocument();
    expect(screen.queryByText(/^原句$/i)).not.toBeInTheDocument();
  });

  it('uses the phrase example as the primary memory aid and hides source sentence by default', () => {
    render(
      <ExplainPanelContent
        onRetry={() => {}}
        onToggleSave={() => {}}
        saveEnabled={false}
        saved={false}
        state={{
          status: 'success',
          data: {
            mode: 'phrase',
            selectedText: 'main idea',
            meaning: '主旨',
            contextMeaning: '这里指读者要抓住文章主线。',
            explanation: 'main 修饰 idea，合起来就是最核心的意思。',
            usageExample: 'Try to write the main idea in one short sentence.',
            sourceSentence:
              'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
          },
        }}
      />,
    );

    expect(screen.getByText(/^常用场景$/i)).toBeInTheDocument();
    expect(
      screen.getByText('Try to write the main idea in one short sentence.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^原句$/i)).not.toBeInTheDocument();
  });

  it('renders the editorial loading card for word lookups', () => {
    render(
      <ExplainPanelContent
        onRetry={() => {}}
        onToggleSave={() => {}}
        saveEnabled={false}
        saved={false}
        state={{
          status: 'loading',
          mode: 'word',
          selectedText: 'panic',
        }}
      />,
    );

    expect(screen.getByText(/正在生成讲解/i)).toBeInTheDocument();
    expect(screen.getByText(/单词批注稿/i)).toBeInTheDocument();
    expect(screen.getByText(/定位这个词在原句里的真实意思/i)).toBeInTheDocument();
  });

  it('shows a re-add action when the word is already remembered', () => {
    render(
      <ExplainPanelContent
        onRetry={() => {}}
        onToggleSave={() => {}}
        remembered
        saveEnabled
        saved={false}
        state={{
          status: 'success',
          data: {
            mode: 'word',
            selectedText: 'panic',
            meaning: '慌乱',
            contextMeaning: '这里指读者读不懂时的慌乱感。',
            explanation: '先别把 panic 理解成严重恐慌，这里更像阅读被打断时的紧张。',
            sourceSentence:
              'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /重新加入生词库/i })).toBeInTheDocument();
  });
});
