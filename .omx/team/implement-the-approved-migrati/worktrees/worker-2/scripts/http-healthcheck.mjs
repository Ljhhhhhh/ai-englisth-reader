const port = process.env.PORT ?? '3000';
const target =
  process.env.HEALTHCHECK_URL ?? `http://127.0.0.1:${port}/api/health`;
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? '5000');

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(target, {
    headers: {
      accept: 'application/json',
    },
    signal: controller.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Healthcheck failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  if (payload?.status !== 'ok') {
    throw new Error(`Unexpected readiness payload: ${JSON.stringify(payload)}`);
  }

  console.log(`[healthcheck] ok ${target}`);
} finally {
  clearTimeout(timeout);
}
