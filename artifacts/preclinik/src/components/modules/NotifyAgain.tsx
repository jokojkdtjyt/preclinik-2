import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, Clock } from 'lucide-react';
import { getPendingModulesQueryKey } from '@/hooks/usePendingModules';

/** Cooldown in ms — 1 min for testing, bump to 6 * 3600 * 1000 for production */
export const REMIND_COOLDOWN_MS = 60 * 1000;

export function NotifyAgain({
  sessionId,
  lastRemindedAt,
  createdAt,
}: {
  sessionId: string;
  lastRemindedAt: string | null;
  createdAt: string;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  const cooldownStart = new Date(lastRemindedAt ?? createdAt).getTime();
  const enablesAt = cooldownStart + REMIND_COOLDOWN_MS;
  const [remaining, setRemaining] = useState(() => Math.max(0, enablesAt - Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(Math.max(0, enablesAt - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [enablesAt, remaining]);

  const formatCountdown = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleNotify = useCallback(async () => {
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/purchases/remind/${sessionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; remainingMs?: number };
        if (body.remainingMs) {
          setRemaining(body.remainingMs);
          toast.error('Please wait before sending another reminder.');
        } else {
          throw new Error(body.error ?? 'Failed to send reminder');
        }
        return;
      }
      toast.success('Reminder sent to admin!');
      setRemaining(REMIND_COOLDOWN_MS);
      queryClient.invalidateQueries({ queryKey: getPendingModulesQueryKey() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send reminder');
    } finally {
      setSending(false);
    }
  }, [getToken, sessionId, queryClient]);

  const disabled = remaining > 0 || sending;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); void handleNotify(); }}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold font-mono border transition-all ${
        disabled
          ? 'bg-secondary text-muted-foreground border-border cursor-not-allowed opacity-70'
          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-pointer'
      }`}
    >
      {remaining > 0 ? (
        <><Clock className="w-3 h-3 shrink-0" />{formatCountdown(remaining)}</>
      ) : sending ? (
        <span>Sending…</span>
      ) : (
        <><Bell className="w-3 h-3 shrink-0" />Notify Again</>
      )}
    </button>
  );
}
