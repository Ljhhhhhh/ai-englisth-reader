import { render, screen } from '@testing-library/react';
import { ContinueReading } from '@/components/home/continue-reading';

vi.mock('@/features/reader/progress-service', () => ({
  listRecentProgress: () => [
    {
      articleSlug: 'welcome-to-deep-reading',
      currentStage: 'read',
      deviceId: 'device-1',
      paragraphId: 'p1',
      updatedAt: Date.now(),
    },
  ],
}));

vi.mock('@/lib/device-id', () => ({
  getOrCreateDeviceId: () => 'device-1',
}));

describe('ContinueReading', () => {
  it('shows segmented reading resume copy and a continue-reading CTA', async () => {
    render(
      <ContinueReading
        articles={[
          {
            slug: 'welcome-to-deep-reading',
            title: '更从容地读英文',
          },
        ]}
      />,
    );

    expect(await screen.findByText(/上次读到第 1 段/i)).toBeInTheDocument();

    const button = await screen.findByRole('link', { name: /继续阅读/i });
    expect(button).toHaveAttribute('href', '/reader/welcome-to-deep-reading');
    expect(button).toHaveStyle({ display: 'inline-flex' });
  });
});
