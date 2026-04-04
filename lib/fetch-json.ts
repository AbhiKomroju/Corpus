/**
 * Browser-safe helpers for JSON responses — avoids calling `res.json()` on HTML error pages
 * (misrouted deploys, CDN 404 bodies, etc.) which throw or yield useless data.
 */

/** True for 2xx status codes */
export function isHttpSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Whether a response Content-Type should be read as JSON (charset suffix allowed).
 * Exported for callers that branch before consuming the body (e.g. PDF probe vs JSON error).
 */
export function mimeTypeLooksLikeJson(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.includes('application/json') ||
    ct.includes('application/problem+json') ||
    ct.includes('+json')
  );
}

/**
 * After `fetchJson` / `readJsonResponse` succeeds, maps `{ error }` + HTTP status to one message.
 */
export function getApiPayloadError<T extends { error?: string }>(
  data: T,
  status: number,
): string | null {
  if (data.error) return data.error;
  if (!isHttpSuccess(status)) return `Request failed (${status})`;
  return null;
}

/**
 * Parses JSON from a Response only when Content-Type indicates JSON.
 * @param res - Fetch Response (body consumed)
 */
export async function readJsonResponse<T>(res: Response): Promise<
  { ok: true; data: T } | { ok: false; error: string }
> {
  const ct = res.headers.get('content-type') ?? '';
  if (!mimeTypeLooksLikeJson(ct)) {
    const text = await res.text();
    const preview = text.replace(/\s+/g, ' ').slice(0, 120).trim();
    const hint = preview ? `: ${preview}` : '';
    return {
      ok: false,
      error: `Expected JSON (${res.status}${hint})`,
    };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Malformed JSON in response body' };
  }
}

export type FetchJsonOk<T> = { ok: true; status: number; data: T };
export type FetchJsonErr = { ok: false; status: number; error: string };

/**
 * `fetch` plus safe JSON parsing. Network failures return `ok: false` with `status: 0`.
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<FetchJsonOk<T> | FetchJsonErr> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e: unknown) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }

  const parsed = await readJsonResponse<T>(res);
  if (!parsed.ok) {
    return { ok: false, status: res.status, error: parsed.error };
  }
  return { ok: true, status: res.status, data: parsed.data };
}
