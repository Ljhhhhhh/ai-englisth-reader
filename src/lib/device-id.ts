const DEVICE_KEY = "ai-english-read-device-id";

function createDeviceId() {
  return `device_${crypto.randomUUID()}`;
}

export function getOrCreateDeviceId(storage?: Pick<Storage, "getItem" | "setItem">) {
  if (!storage) {
    return createDeviceId();
  }

  const existing = storage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const nextId = createDeviceId();
  storage.setItem(DEVICE_KEY, nextId);
  return nextId;
}
