import { getOrCreateDeviceId } from '@/lib/device-id';

describe('getOrCreateDeviceId', () => {
  it('reuses an existing device id from storage', () => {
    const storage = {
      getItem: vi.fn(() => 'device_existing'),
      setItem: vi.fn(),
    };

    expect(getOrCreateDeviceId(storage)).toBe('device_existing');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('creates and stores a uuid-based device id when storage is empty', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };

    const deviceId = getOrCreateDeviceId(storage);

    expect(deviceId).toMatch(/^device_[0-9a-f-]{36}$/);
    expect(storage.setItem).toHaveBeenCalledWith(
      'ai-english-read-device-id',
      deviceId,
    );
  });
});
