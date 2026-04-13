const DEFAULT_REDIRECT_PATH = '/';

export function getSafeRedirectPath(input: string | null | undefined) {
  if (!input || !input.startsWith('/') || input.startsWith('//')) {
    return DEFAULT_REDIRECT_PATH;
  }

  try {
    const url = new URL(input, 'https://lexora.local');
    const nextPath = `${url.pathname}${url.search}${url.hash}`;

    if (nextPath === '/login' || nextPath.startsWith('/login?') || nextPath.startsWith('/login#')) {
      return DEFAULT_REDIRECT_PATH;
    }

    return nextPath;
  } catch {
    return DEFAULT_REDIRECT_PATH;
  }
}
