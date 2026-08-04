import type { AuthRealm } from '@/store/auth.store';

/**
 * Which routes may bounce a visitor to a login screen when their session dies.
 *
 * THE BUG THIS EXISTS TO PREVENT: `isAuthenticated` persists in localStorage, but
 * the refresh token behind it expires. So every returning visitor eventually opens
 * the app holding a session that LOOKS live and is actually dead. The root layout's
 * SocketManager fires `/notifications/unread-count` on mount — on EVERY page — that
 * 401s, the refresh 401s (definitive), and api.ts hard-navigated to /login. Result:
 * opening the app on the homepage threw you onto the login screen, with no way to
 * browse. Classifieds browsing is public; only ACTIONS need an account.
 *
 * The frontend is NOT an access-control boundary — the backend API is. This list
 * decides one thing only: whether a dead session should REDIRECT or just quietly
 * log the user out and let them keep browsing.
 *
 * Deliberately a small allow-list of the routes that are useless without a session,
 * rather than "anything not in a public list": a route missing from a PUBLIC list
 * would wrongly redirect (the bug we are fixing), while a route missing from THIS
 * list merely renders its own logged-out state — the safe direction to fail.
 */
const PROTECTED_USER_PREFIXES = [
  '/account',         // dashboard, listings, wallet, favorites, settings, messages
  '/messages',        // legacy entry; server-redirects into /account/messages
  '/listings/create',
  '/listings/edit',
];

/**
 * Does `pathname` require a live session to be worth showing?
 *
 * Staff realms are wholly gated — every /admin, /agent and /accounting route is a
 * back-office surface with nothing to show a logged-out visitor, and each portal
 * owns its own login path (see LOGIN_PATHS in api.ts). Only the consumer realm has
 * a public half, so only it consults the list.
 */
export function requiresAuth(pathname: string, realm: AuthRealm): boolean {
  if (realm !== 'user') return true;
  return PROTECTED_USER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
