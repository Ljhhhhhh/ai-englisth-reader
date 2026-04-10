import { render, screen } from '@testing-library/react';
import { ContinueReading } from '@/components/home/continue-reading';

const listRecentProgressMock = vi.fn();

vi.mock('@/features/reader/progress-service', () => ({
  listRecentProgress: (...args: unknown[]) => listRecentProgressMock(...args),
}));

vi.mock('@/lib/device-id', () => ({
  getOrCreateDeviceId: () => 'device-1',
}));

describe('ContinueReading', () => {
  beforeEach(() => {
    listRecentProgressMock.mockReturnValue([
      {
        articleSlug: 'welcome-to-deep-reading',
        currentStage: 'read',
        deviceId: 'device-1',
        isCompleted: false,
        updatedAt: Date.now(),
      },
    ]);
  });

  it('shows article-level resume copy and a continue-reading CTA', async () => {
    render(
      <ContinueReading
        articles={[
          {
            slug: 'welcome-to-deep-reading',
            chineseTitle: '更从容地读英文',
          },
        ]}
      />,
    );

    expect(await screen.findByText(/上次读到正文/i)).toBeInTheDocument();

    const button = await screen.findByRole('link', { name: /继续阅读/i });
    expect(button).toHaveAttribute('href', '/reader/welcome-to-deep-reading');
    expect(button).toHaveStyle({ display: 'inline-flex' });
  });

  it('ignores completed articles when choosing the continue-reading card', async () => {
    listRecentProgressMock.mockReturnValue([
      {
        articleSlug: 'welcome-to-deep-reading',
        currentStage: 'read',
        deviceId: 'device-1',
        isCompleted: true,
        updatedAt: Date.now(),
      },
      {
        articleSlug: 'second-sample-article',
        currentStage: 'read',
        deviceId: 'device-1',
        isCompleted: false,
        updatedAt: Date.now() - 1000,
      },
    ]);

    render(
      <ContinueReading
        articles={[
          {
            slug: 'welcome-to-deep-reading',
            chineseTitle: '更从容地读英文',
          },
          {
            slug: 'second-sample-article',
            chineseTitle: '为什么精读胜过零散查词',
          },
        ]}
      />,
    );

    expect(await screen.findByText(/为什么精读胜过零散查词/i)).toBeInTheDocument();
    expect(screen.queryByText(/^更从容地读英文$/i)).not.toBeInTheDocument();
  });
});
