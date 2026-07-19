import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";

export interface PendingSession {
  sessionId: string;
  moduleIds: string[];
  /** ISO string or null */
  lastRemindedAt: string | null;
  /** ISO string */
  createdAt: string;
}

export const getPendingModulesQueryKey = () => ["/api/purchases/pending"] as const;

export function usePendingModules() {
  const { getToken } = useAuth();

  return useQuery<PendingSession[]>({
    queryKey: getPendingModulesQueryKey(),
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/purchases/pending", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to fetch pending purchases");
      return res.json() as Promise<PendingSession[]>;
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}
