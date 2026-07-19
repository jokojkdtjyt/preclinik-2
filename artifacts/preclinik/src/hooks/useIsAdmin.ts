import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

/**
 * Returns { isAdmin: boolean } for the currently signed-in user.
 *
 * Design decisions (all three matter for stability):
 *
 * 1. staleTime: 5 min — admin status doesn't change mid-session; no need
 *    to re-hit the server on every mount or window focus.
 *
 * 2. refetchOnWindowFocus: false — prevents the most common flip scenario:
 *    user switches browser tabs, Clerk is mid-refresh, getToken() returns
 *    null, request goes unauthenticated, server returns { isAdmin: false },
 *    AdminRoute sees false and redirects to "/".
 *
 * 3. Throw on null token / non-2xx — React Query ONLY updates cached data
 *    on success. If the queryFn throws, the old { isAdmin: true } value
 *    stays in the cache and the UI is unaffected. React Query will retry
 *    automatically (up to 3 times) before surfacing an error.
 */
export function useIsAdmin() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["/api/me/role"],
    enabled: isSignedIn === true,

    // 5-minute cache — re-fetches only on page mount after 5 min have passed
    staleTime: 5 * 60 * 1000,

    // Do NOT re-fetch when the user alt-tabs back — that's the #1 cause of
    // the transient false-negative that flips the admin view to student view.
    refetchOnWindowFocus: false,

    // Retry on transient failures (expired token mid-refresh, network blip)
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),

    queryFn: async (): Promise<{ isAdmin: boolean }> => {
      const token = await getToken();

      // If Clerk can't produce a token right now (mid-refresh), throw so
      // React Query retries rather than caching a false { isAdmin: false }.
      if (!token) {
        throw new Error("Clerk token not ready — will retry");
      }

      const res = await fetch("/api/me/role", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // On any server error, throw so React Query retries and the cached
      // value (isAdmin: true) stays visible. Only a clean 200 with
      // isAdmin: false should flip the UI.
      if (!res.ok) {
        throw new Error(`Role check failed with HTTP ${res.status} — will retry`);
      }

      return res.json();
    },
  });
}
