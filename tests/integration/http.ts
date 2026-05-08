export interface JsonRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
}

export interface JsonResponse<T> {
  response: Response;
  status: number;
  data: T | null;
  text: string;
}

const baseUrl =
  process.env.INTEGRATION_TEST_BASE_URL ??
  process.env.BASE_URL ??
  'http://127.0.0.1:3105';

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function requestJson<T>(
  path: string,
  options: JsonRequestOptions = {}
): Promise<JsonResponse<T>> {
  const headers = new Headers(options.headers);
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body,
  });

  const text = await response.text();
  let data: T | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }

  return {
    response,
    status: response.status,
    data,
    text,
  };
}