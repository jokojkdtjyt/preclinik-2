import { useAuth } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  moduleId: string | null;
  createdAt: string;
}

export const getNotificationsQueryKey = () => ["/api/notifications"] as const;

export function useNotifications() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<AppNotification[]>({
    queryKey: getNotificationsQueryKey(),
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json() as Promise<AppNotification[]>;
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const token = await getToken();
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
      // Optimistically remove from cache
      queryClient.setQueryData<AppNotification[]>(
        getNotificationsQueryKey(),
        (prev) => prev?.filter((n) => !ids.includes(n.id)) ?? [],
      );
    },
    [getToken, queryClient],
  );

  return { ...query, markRead };
}
