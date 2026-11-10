import {
  accessTokenResponseSchema,
  apiErrorSchema,
  type ErrorCode,
  type ErrorDetail,
} from '@launchly/shared';

/** Every failed API call rejects with this, built from the shared error contract. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ResponseSchema<T> = {
  safeParse: (input: unknown) => { success: true; data: T } | { success: false };
};

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** A plain value is sent as JSON; FormData is sent as multipart. */
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /**
   * Browser only: attach the access token and refresh it once on 401.
   * Default true; public auth endpoints (login, register...) pass false.
   */
  auth?: boolean;
  /** Next.js server caching, e.g. `{ cache: 'no-store' }` or `{ next: { revalidate: 60 } }`. */
  cache?: RequestCache;
  next?: RequestInit['next'];
  signal?: AbortSignal;
};

const isBrowser = typeof window !== 'undefined';

// The access token lives in memory only; the refresh token is an httpOnly cookie.
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshInFlight: Promise<{ accessToken: string; expiresIn: number }> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Called when a request gets 401 and the session cannot be refreshed. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/**
 * The browser goes through the Next.js rewrite (`/api/*` -> `${API_URL}/*`);
 * server components call the API directly.
 */
function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = isBrowser ? '/api' : (process.env.API_URL ?? 'http://localhost:4000');
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

async function send(path: string, options: RequestOptions, retried = false): Promise<Response> {
  const headers = new Headers();
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const useAuth = isBrowser && options.auth !== false;
  if (useAuth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      credentials: 'same-origin',
      cache: options.cache,
      next: options.next,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'INTERNAL_ERROR',
      'Không thể kết nối máy chủ. Hãy kiểm tra API rồi thử lại.',
      0,
    );
  }

  if (response.status === 401 && useAuth && !retried) {
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      accessToken = null;
      onSessionExpired?.();
      throw refreshError;
    }
    return send(path, options, true);
  }

  if (!response.ok) throw await toApiError(response);
  return response;
}

async function toApiError(response: Response): Promise<ApiError> {
  const fallback = new ApiError(
    'INTERNAL_ERROR',
    'Máy chủ chưa thể xử lý yêu cầu. Vui lòng thử lại.',
    response.status,
  );
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return fallback;
  }
  const parsed = apiErrorSchema.safeParse(payload);
  if (!parsed.success) return fallback;
  const { code, message, details } = parsed.data.error;
  return new ApiError(code, message, response.status, details);
}

/** Sends a request and validates the JSON response against a shared Zod schema. */
export async function request<T>(
  path: string,
  schema: ResponseSchema<T>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, options);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ApiError('INTERNAL_ERROR', 'Máy chủ trả về dữ liệu không hợp lệ.', response.status);
  }
  return result.data;
}

/** Sends a request whose response body is ignored (e.g. 204 No Content). */
export async function requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options);
}

/** Sends a request and returns the response body as a file. */
export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await send(path, options);
  return response.blob();
}

/**
 * Exchanges the refresh cookie for a new access token; concurrent callers share one request.
 * Uses `.then()` rather than `async/await` on purpose: the in-flight Promise itself is cached.
 */
export function refreshAccessToken() {
  refreshInFlight ??= request('/auth/refresh', accessTokenResponseSchema, {
    method: 'POST',
    auth: false,
  })
    .then((session) => {
      accessToken = session.accessToken;
      return session;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}
