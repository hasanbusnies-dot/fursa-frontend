import { create } from 'zustand';
import { favoritesService } from '@/services/favorites.service';

/**
 * Session-wide set of favorited listing IDs.
 *
 * WHY this exists: listing payloads carry no isFavorited flag, so a card had no
 * way to know its own state and always rendered an empty star after a reload.
 * The per-id /favorites/check call is fine for the detail page but would fire
 * once per card in a grid — so the set is loaded ONCE (single-flight) and every
 * card reads from it. Toggling writes back here, which also keeps duplicate
 * cards for the same listing in sync.
 */
interface FavoritesState {
  ids: Set<string>;
  loaded: boolean;
  loading: boolean;
  /** Loads the set once per session. Concurrent callers share one request. */
  ensureLoaded: () => Promise<void>;
  /** Write a single id's state (used for optimistic toggles + rollback). */
  setFavorited: (listingId: string, favorited: boolean) => void;
  /** Drop everything — called on logout so the next user starts clean. */
  reset: () => void;
}

let inFlight: Promise<void> | null = null;

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  loaded: false,
  loading: false,

  ensureLoaded: async () => {
    if (get().loaded) return;
    if (inFlight) return inFlight;

    set({ loading: true });
    inFlight = favoritesService
      .getAll()
      .then((listings) => {
        set({ ids: new Set(listings.map((l) => l.id)), loaded: true, loading: false });
      })
      .catch(() => {
        // Leave loaded=false so a later mount can retry; the star stays empty
        // meanwhile, which matches the pre-existing behaviour.
        set({ loading: false });
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  setFavorited: (listingId, favorited) => {
    const next = new Set(get().ids);
    if (favorited) next.add(listingId);
    else next.delete(listingId);
    set({ ids: next });
  },

  reset: () => {
    // No-op when already clean. Every card calls this on mount while logged
    // out; without the guard each call would publish a fresh Set and re-render
    // the whole grid once per card.
    const { ids, loaded, loading } = get();
    if (!loaded && !loading && ids.size === 0) return;
    inFlight = null;
    set({ ids: new Set<string>(), loaded: false, loading: false });
  },
}));
