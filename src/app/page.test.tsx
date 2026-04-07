import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('shows the product promise on the homepage', async () => {
    render(await HomePage({}));
    expect(screen.getByText(/read one article deeply/i)).toBeInTheDocument();
  });

  it('shows sample articles on the homepage', async () => {
    render(await HomePage({}));
    expect(
      screen.getByText(/A calmer way to read English/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Why deep reading beats scattered lookup/i),
    ).toBeInTheDocument();
  });
});
