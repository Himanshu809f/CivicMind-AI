/**
 * Centralised HTTP helper used by server-side integrations (the Python AI
 * service today). It owns timeouts, bounded retries, JSON parsing and error
 * shaping so callers never re-implement them.
 *
 * Never call this from browser code with a secret: secrets stay in server
 * functions (`process.env`), never in `import.meta.env`.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Milliseconds before the request is aborted. Default 12000. */
  timeoutMs?: number;
  /** Extra attempts after the first one, for timeouts and 5xx. Default 1. */
  retries?: number;
};

export function createApiClient(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>({
    method = "GET",
    path,
    body,
    headers = {},
    timeoutMs = 12_000,
    retries = 1,
  }: ApiRequest): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${base}${path}`, {
          method,
          headers: {
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            ...defaultHeaders,
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          const error = new ApiError(`Request to ${path} failed`, res.status, text);
          // Only 5xx and 429 are worth another attempt.
          if ((res.status >= 500 || res.status === 429) && attempt < retries) {
            lastError = error;
            await delay(300 * (attempt + 1));
            continue;
          }
          throw error;
        }

        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        lastError = error;
        if (attempt < retries) {
          await delay(300 * (attempt + 1));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ApiError(
      lastError instanceof Error ? lastError.message : `Request to ${path} failed`,
      0,
    );
  }

  return { request };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
