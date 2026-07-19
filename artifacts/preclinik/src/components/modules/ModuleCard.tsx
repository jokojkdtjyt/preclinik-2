import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { ICON_MAP } from '@/lib/constants';
import {
  Module,
  useAddToCart,
  useRemoveFromCart,
  useGetCart,
  getGetCartQueryKey,
  useListPurchased,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Check, PlayCircle, Clock, Bell } from 'lucide-react';
import { usePendingModules, getPendingModulesQueryKey } from '@/hooks/usePendingModules';
import { useAuth } from '@clerk/react';

/** Cooldown in ms — 1 min for testing, bump to 6 * 3600 * 1000 for production */
const REMIND_COOLDOWN_MS = 60 * 1000;

interface ModuleCardProps {
  module: Module;
  /** 'store' (default) — show price + cart button, browsing/purchasing context.
   *  'library' — show only "Continue Learning", no price or cart UI. */
  variant?: 'store' | 'library';
}

// ── Countdown + Notify Again button ──────────────────────────────────────────
function NotifyAgain({
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

  // Effective start of the current cooldown window
  const cooldownStart = new Date(lastRemindedAt ?? createdAt).getTime();
  const enablesAt = cooldownStart + REMIND_COOLDOWN_MS;

  const [remaining, setRemaining] = useState(() => Math.max(0, enablesAt - Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const r = Math.max(0, enablesAt - Date.now());
      setRemaining(r);
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
      // Reset cooldown from now
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
        <>
          <Clock className="w-3 h-3 shrink-0" />
          {formatCountdown(remaining)}
        </>
      ) : sending ? (
        <span>Sending…</span>
      ) : (
        <>
          <Bell className="w-3 h-3 shrink-0" />
          Notify Again
        </>
      )}
    </button>
  );
}

// ── Main ModuleCard ───────────────────────────────────────────────────────────
export function ModuleCard({ module, variant = 'store' }: ModuleCardProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const Icon = ICON_MAP[module.icon] || PlayCircle;
  const isLibrary = variant === 'library';

  // In library mode we skip cart queries — they're not needed and add noise.
  const { data: cart } = useGetCart({ query: { enabled: !isLibrary } });
  const { data: purchasedList } = useListPurchased();
  const { data: pendingSessions } = usePendingModules();

  // In library mode every card is by definition owned.
  const isPurchased = isLibrary || (purchasedList?.includes(module.id) ?? false);
  const inCart = !isLibrary && (cart?.items.some(i => i.moduleId === module.id) ?? false);

  // Find a pending session that contains this module
  const pendingSession = useMemo(
    () => pendingSessions?.find(s => s.moduleIds.includes(module.id)) ?? null,
    [pendingSessions, module.id],
  );
  const isPending = !isPurchased && !isLibrary && pendingSession !== null;

  const addToCart = useAddToCart();
  const removeFromCart = useRemoveFromCart();

  const handleCardClick = () => setLocation(`/modules/${module.id}`);
  const handleViewModule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/modules/${module.id}`);
  };

  const handleCartToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) {
      removeFromCart.mutate(
        { moduleId: module.id },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetCartQueryKey(), data);
          },
          onError: () => toast.error('Could not remove from cart. Please try again.'),
        },
      );
    } else {
      addToCart.mutate(
        { moduleId: module.id },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetCartQueryKey(), data);
            toast.success(`${module.title} added to cart`);
          },
          onError: () => toast.error('Could not add to cart. Please try again.'),
        },
      );
    }
  };

  const viewLabel = isPurchased ? 'Continue Learning' : 'View';

  return (
    <div
      className="group flex flex-col bg-white rounded-[22px] overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border border-border"
      style={{ boxShadow: 'var(--shadow)' }}
      onClick={handleCardClick}
      data-testid={`card-module-${module.id}`}
    >
      {/* Coloured header strip */}
      <div
        className="h-32 w-full p-6 flex flex-col justify-between items-start text-white relative overflow-hidden"
        style={{ background: module.gradient || 'linear-gradient(135deg, var(--blue), var(--orange))' }}
      >
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Icon className="w-8 h-8 opacity-80" />
        <div>
          <div className="text-xs uppercase tracking-widest font-mono opacity-90">{module.provider}</div>
          <div className="font-semibold text-sm">{module.category}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
            Year {module.year}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider font-mono">
            {module.level}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-orange/10 text-[#b9852e] text-[10px] font-bold uppercase tracking-wider font-mono">
            ★ {module.rating.toFixed(1)}
          </span>
          {!module.published && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider font-mono">
              Draft
            </span>
          )}
          {/* Pending Review badge */}
          {isPending && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider font-mono border border-amber-200">
              ⏳ Pending Review
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 brand">{module.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">{module.summary}</p>

        {/* Progress row (owned) or meta row (unowned) */}
        {isPurchased ? (
          <div className="mb-4">
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-green-600 h-full rounded-full" style={{ width: '0%' }} />
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              0% complete · {module.duration} · {module.students} students
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground font-mono mb-4">
            {module.duration} · {module.students} students
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
          {/* Left slot */}
          {isLibrary ? (
            <span />
          ) : isPurchased ? (
            <span className="text-green-700 bg-green-50 px-3 py-1 rounded-full text-xs font-bold font-mono border border-green-200">
              OWNED
            </span>
          ) : isPending ? (
            // Pending: show Notify Again in the left slot (price is hidden while under review)
            <NotifyAgain
              sessionId={pendingSession!.sessionId}
              lastRemindedAt={pendingSession!.lastRemindedAt}
              createdAt={pendingSession!.createdAt}
            />
          ) : (
            <span className="text-foreground font-bold font-mono">
              {module.price} DZD
            </span>
          )}

          {/* Right slot */}
          <div className="flex items-center gap-2">
            {/* Cart toggle — store mode, not yet owned, not pending */}
            {!isLibrary && !isPurchased && !isPending && (
              <button
                onClick={handleCartToggle}
                disabled={addToCart.isPending || removeFromCart.isPending}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-60 ${
                  inCart
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
                data-testid={`btn-cart-${module.id}`}
              >
                {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              </button>
            )}

            {/* View / Continue Learning */}
            <button
              onClick={handleViewModule}
              className="bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold px-4 py-1.5 rounded-[10px] transition-colors whitespace-nowrap"
              data-testid={`btn-view-${module.id}`}
            >
              {viewLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
