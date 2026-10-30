// src/utils/dataRefresh.js
// ============================================================
// AI TOUR — GLOBAL DATA INVALIDATION BUS
// ============================================================
// A tiny in-app pub/sub that lets any mutation (cancel booking,
// approve provider, delete listing, confirm payment, etc.) tell
// every mounted page that a data domain is stale.
//
// Pages subscribe via `useRefreshOn('bookings', refetchFn)`.
// When any mutation calls `refreshData('bookings')`, all
// subscribers for that domain re-run their own refetch.
//
// Zero dependencies. Pure React. Safe to import anywhere.
// ============================================================

const listeners = new Map(); // domain -> Set<fn>

// Coalesce rapid refreshes into a single tick so 3 successive
// mutations don't trigger 3 refetches of every subscriber.
const pendingDomains = new Set();
let flushScheduled = false;

const flush = () => {
  flushScheduled = false;
  const domains = Array.from(pendingDomains);
  pendingDomains.clear();

  for (const domain of domains) {
    const subs = listeners.get(domain);
    if (!subs) continue;
    for (const fn of subs) {
      try {
        fn();
      } catch (err) {
        console.error(
          `[dataRefresh] subscriber failed for "${domain}":`,
          err
        );
      }
    }
  }
};

/**
 * Broadcast that a data domain is stale.
 * Subscribers refetch on the next microtask.
 *
 * Known domains used across the app:
 *   - 'bookings'
 *   - 'bookings:traveler'
 *   - 'bookings:provider'
 *   - 'listings'
 *   - 'listings:provider'
 *   - 'listings:admin'
 *   - 'payments'
 *   - 'payments:traveler'
 *   - 'payments:provider'
 *   - 'payments:admin'
 *   - 'reviews'
 *   - 'reviews:provider'
 *   - 'reviews:admin'
 *   - 'provider-requests'
 *   - 'providers'
 *   - 'users'
 *   - 'notifications'
 *   - 'wallet'
 *   - 'settlements'
 *   - 'ledger'
 *   - 'dashboard'
 *   - 'hero'
 *
 * Any string works — the app just needs to use the same string
 * on both sides. Split with `:` for scoped domains.
 */
export const refreshData = (domain) => {
  if (!domain) return;
  pendingDomains.add(domain);
  if (!flushScheduled) {
    flushScheduled = true;
    // queueMicrotask keeps us in the same task tick as the
    // mutation's promise resolution — the UI paints once with
    // fresh data instead of flashing.
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(flush);
    } else {
      setTimeout(flush, 0);
    }
  }
};

/**
 * Subscribe to a domain. Returns an unsubscribe function.
 * Used by `useRefreshOn` — you should not need to call this
 * directly.
 */
export const subscribe = (domain, handler) => {
  if (!domain || typeof handler !== 'function') {
    return () => {};
  }
  if (!listeners.has(domain)) {
    listeners.set(domain, new Set());
  }
  listeners.get(domain).add(handler);

  return () => {
    const subs = listeners.get(domain);
    if (!subs) return;
    subs.delete(handler);
    if (subs.size === 0) {
      listeners.delete(domain);
    }
  };
};

/**
 * Fires multiple domains at once — useful after a mutation that
 * touches several domains (e.g. canceling a booking also
 * affects the dashboard counters).
 */
export const refreshMany = (...domains) => {
  for (const d of domains) {
    if (d) refreshData(d);
  }
};