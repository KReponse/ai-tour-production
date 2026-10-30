// src/hooks/useRefreshOn.js
// ============================================================
// AI TOUR — useRefreshOn HOOK
// ============================================================
// Subscribes a refetch callback to one or more data domains.
// When any of them is invalidated (via refreshData /
// refreshMany from `utils/dataRefresh.js`), the callback runs.
//
// Usage in any page:
//
//   const { data, refresh } = usePagination({...});
//
//   useRefreshOn(['bookings', 'bookings:traveler'], refresh);
//
// The callback is automatically wrapped in a ref so the hook
// does not need to re-subscribe when the refetch function is
// recreated on each render (which it always is).
// ============================================================

import { useEffect, useRef } from 'react';
import { subscribe } from '../utils/dataRefresh';

const useRefreshOn = (domains, callback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Normalize to an array of strings
  const domainList = Array.isArray(domains)
    ? domains
    : [domains];

  // Stable dep string so the effect only re-runs when the
  // actual domain names change.
  const key = domainList.filter(Boolean).sort().join('|');

  useEffect(() => {
    if (!key) return;

    const names = key.split('|');

    const unsubscribers = names.map((name) =>
      subscribe(name, () => {
        try {
          callbackRef.current?.();
        } catch (err) {
          console.error(
            `[useRefreshOn] callback failed for "${name}":`,
            err
          );
        }
      })
    );

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [key]);
};

export default useRefreshOn;