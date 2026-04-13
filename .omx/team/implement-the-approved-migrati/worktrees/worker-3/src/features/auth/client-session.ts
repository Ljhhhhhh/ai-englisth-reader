export type ClientAuthSession = {
  authenticated: boolean;
  user: {
    email: string;
    id: string;
  } | null;
};

export async function loadClientSession() {
  const response = await fetch('/api/auth/session', {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ClientAuthSession;
}
