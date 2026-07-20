import React, { useMemo } from 'react';
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
  getListPurchasedQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { ShoppingCart, Check, PlayCircle, Zap } from 'lucide-react';
import { usePendingModules } from '@/hooks/usePendingModules';
import { NotifyAgain } from './NotifyAgain';
import { getExtraHeaders } from '@workspace/api-client-react';

interface ModuleCardProps {
  module: Module;
  /** 'store' (default) — show price + cart button, browsing/purchasing context.
   *  'library' — show only "Continue Learning", no price or cart UI. */
  variant?: 'store' | 'library';
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
  const { getToken } = useAuth();

  // Free module — not purchased, not pending, not in library
  const isFree = !isPurchased && !isLibrary && !isPending && !!module.isFree;

  const handleFreeEnroll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      const res = await fetch(`/api/modules/${module.id}/enroll-free`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...getExtraHeaders(),
        },
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getListPurchasedQueryKey() });
      toast.success(`${module.title} unlocked — start learning!`);
      setLocation(`/modules/${module.id}`);
    } catch {
      toast.error('Could not unlock module. Please try again.');
    }
  };

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
          {/* Free badge */}
          {isFree && (
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider font-mono border border-green-200">
              🎁 Free
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
            <NotifyAgain
              sessionId={pendingSession!.sessionId}
              lastRemindedAt={pendingSession!.lastRemindedAt}
              createdAt={pendingSession!.createdAt}
            />
          ) : isFree ? (
            <span className="text-green-700 font-bold font-mono text-sm">FREE</span>
          ) : (
            <span className="text-foreground font-bold font-mono">
              {module.price} DZD
            </span>
          )}

          {/* Right slot */}
          <div className="flex items-center gap-2">
            {/* Free enroll button — replaces cart */}
            {isFree ? (
              <button
                onClick={handleFreeEnroll}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-1.5 rounded-[10px] transition-colors whitespace-nowrap shadow-sm"
                data-testid={`btn-free-${module.id}`}
              >
                <Zap className="w-3.5 h-3.5" /> Start Learning
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
