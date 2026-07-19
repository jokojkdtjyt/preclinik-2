---
name: Clerk token rotation race condition
description: How Clerk's getToken reference rotation causes 401 floods and how it's fixed in this codebase.
---

# Clerk getToken rotation → 401 flood

## The rule
Never use `useEffect([getToken])` to register/deregister an auth token getter. Clerk rotates the `getToken` function reference on every internal token refresh, causing the effect cleanup to run `setAuthTokenGetter(null)` — a brief window where all concurrent API requests send no auth header and get 401.

**Why:** Clerk's React hooks return a new `getToken` reference on each internal state update (token refresh). Any effect that depends on `getToken` will cleanup → re-register, creating a null gap.

**How to apply:** Use a ref to track the latest `getToken` and register the getter once on mount only:
```typescript
const getTokenRef = useRef(getToken);
useEffect(() => { getTokenRef.current = getToken; }); // no deps = every render, keeps ref current
useEffect(() => {
  setAuthTokenGetter(() => getTokenRef.current());
  // no cleanup that sets to null
}, []); // mount only
```
See `artifacts/preclinik/src/App.tsx` — `ClerkTokenSync` component.

## ClerkQueryClientCacheInvalidator: skip null-user transitions
`queryClient.clear()` should only fire when switching between two distinct non-null user IDs. Clerk briefly emits `user = null` during token refresh; triggering a cache clear at that moment wipes all query data and amplifies the 401 flood. Guard:
```typescript
if (prev !== undefined && prev !== null && userId !== null && prev !== userId) {
  queryClient.clear();
}
```
