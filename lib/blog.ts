import type { ApiError } from '@/types/blog';

export const TOKEN_KEY = 'blog-api-token';

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerptFromHtml(html: string, length = 160) {
  const plainText = stripHtml(html);
  if (plainText.length <= length) {
    return plainText;
  }

  return `${plainText.slice(0, length).trimEnd()}...`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'Draft';
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function htmlFromText(text: string) {
  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorBody = (await response.json()) as ApiError;
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // Ignore non-JSON error responses.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}