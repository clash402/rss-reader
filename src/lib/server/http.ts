const DEFAULT_HEADERS = {
  "user-agent": "CurrentReader/1.0 (+https://example.com)",
  accept:
    "application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.9,*/*;q=0.8",
};

export type FetchOptions = RequestInit & {
  timeoutMs?: number;
};

export async function fetchWithTimeout(url: string, init: FetchOptions = {}) {
  const { timeoutMs = 15000, headers, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        ...DEFAULT_HEADERS,
        ...headers,
      },
      signal: controller.signal,
    });

    if (!response.ok && response.status !== 304) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}
