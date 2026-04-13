import { render, screen } from '@testing-library/react';

vi.mock('@/features/auth/page-guard', () => ({
  requirePageSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
}));

import HomePage from '@/app/page';

describe('HomePage', () => {
  it('shows the product promise on the homepage', async () => {
    render(await HomePage({}));
    expect(screen.getByText(/一次真正读懂一篇英文文章/i)).toBeInTheDocument();
  });

  it('shows sample articles on the homepage', async () => {
    render(await HomePage({}));
    expect(screen.getByText(/更从容地读英文/i)).toBeInTheDocument();
    expect(screen.getByText(/为什么精读胜过零散查词/i)).toBeInTheDocument();
  });
});
