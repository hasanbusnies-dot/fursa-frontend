import { ApiError } from '@/services/api';

/**
 * "Did this request fail because the CONNECTION is broken, or because the server
 * gave a real answer we don't like?"
 *
 * Data-fetch failures used to be collapsed into one bucket per page, so a plane
 * ride rendered «الإعلان غير موجود» — telling the user their listing was deleted
 * when in fact the phone had no signal. Anything that is genuinely about
 * connectivity belongs on a retry screen; only a real 404 means "gone".
 *
 * What counts as a connection failure:
 *  • the browser says it is offline — decisive, whatever the error looks like;
 *  • a THROWN fetch (TypeError: Failed to fetch) — DNS, refused, dropped, or
 *    blocked by the SW. These never reach api.ts's response branch, so they
 *    surface as a plain Error, NOT an ApiError;
 *  • 5xx — the server (or, in dev, the backend's own upstream DB) is unreachable
 *    or broken. The founder's airplane-mode test produced exactly this: a 503
 *    from a locally-reachable API whose database had gone away;
 *  • 408 request timeout.
 *
 * Everything else — 404, 403, 400, 422 — is a real answer and keeps whatever
 * page-specific state it already had.
 */
export function isConnectionError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;

  if (err instanceof ApiError) {
    const status = err.status;
    if (status === undefined) return true; // no response was ever seen
    return status >= 500 || status === 408;
  }

  // A rejected fetch (TypeError) or anything non-ApiError: no HTTP exchange
  // completed, so it cannot have been a legitimate "not found".
  return err instanceof Error;
}
