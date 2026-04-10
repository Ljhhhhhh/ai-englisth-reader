import { fireEvent, render, screen } from '@testing-library/react';
import GeneratePage from '@/app/generate/page';

vi.mock('@/lib/device-id', () => ({
  getOrCreateDeviceId: () => 'device-1',
}));

describe('GeneratePage', () => {
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
});
