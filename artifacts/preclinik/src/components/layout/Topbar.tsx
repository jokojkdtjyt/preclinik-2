import React, { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, LogOut, ChevronDown, Bell } from "lucide-react";
import { useGetCart } from "@workspace/api-client-react";
import { CartDrawer } from "./CartDrawer";
import { useUser, useClerk, Show } from "@clerk/react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNotifications } from "@/hooks/useNotifications";

interface TopbarProps {
  role: "student" | "admin";
  setRole: (role: "student" | "admin") => void;
}

// ── Notification bell + dropdown ──────────────────────────────────────────────
function NotificationBell() {
  const { data: notifications = [], markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleMarkAll = () => {
    if (notifications.length === 0) return;
    void markRead(notifications.map((n) => n.id));
    setOpen(false);
  };

  const typeIcon = (type: string) => {
    if (type === "purchase_approved") return "✅";
    if (type === "new_module") return "📚";
    if (type === "new_lesson") return "🎬";
    return "🔔";
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="font-bold text-sm text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-primary hover:underline font-mono"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-mono">No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-border last:border-0 flex gap-3 items-start hover:bg-secondary/40 transition-colors"
                >
                  <span className="text-lg leading-none mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => void markRead([n.id])}
                    className="text-[10px] text-muted-foreground hover:text-primary font-mono shrink-0 mt-0.5"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Avatar / user dropdown ────────────────────────────────────────────────────
function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isLoaded) {
    return <div className="w-10 h-10 rounded-full bg-secondary border border-border animate-pulse" />;
  }

  const initials =
    user
      ? [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("") ||
        user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ||
        "?"
      : "?";

  const displayName =
    user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user?.emailAddresses[0]?.emailAddress ?? "Account";

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 group">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold font-serif shadow-sm ring-2 ring-white group-hover:ring-primary/30 transition-all overflow-hidden"
          style={{ background: "linear-gradient(135deg,#8b1a2f,#b9852e)" }}
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform hidden sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-bold text-sm text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {user?.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => { setOpen(false); signOut({ redirectUrl: basePath || "/" }); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sign-in prompt ────────────────────────────────────────────────────────────
function SignInPrompt() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/sign-in"
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
      >
        Get started
      </Link>
    </div>
  );
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export function Topbar({ role, setRole }: TopbarProps) {
  const [, setLocation] = useLocation();
  const { data: cart } = useGetCart();
  const { data: roleData } = useIsAdmin();
  const isAdmin = roleData?.isAdmin ?? false;
  const cartItemCount = cart?.items.length || 0;
  const [cartOpen, setCartOpen] = useState(false);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (new FormData(e.currentTarget)).get("q");
    if (q) setLocation(`/catalog?search=${encodeURIComponent(q.toString())}`);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 h-[72px] bg-white/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between"
        style={{ boxShadow: "var(--shadow-2xs)" }}
      >
        {/* ── Left: logo + search ── */}
        <div className="flex items-center gap-8 h-full">
          <Link href="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#b9852e] flex items-center justify-center text-white font-bold font-serif text-xl shadow-sm group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-serif font-bold text-lg leading-tight tracking-tight text-foreground">
                PreClinik
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono leading-none">
                Medical Modules
              </span>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex relative w-64 lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search modules, anatomy..."
              className="w-full h-10 bg-secondary/50 border border-transparent hover:border-border focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary rounded-full pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground font-mono"
            />
          </form>
        </div>

        {/* ── Right: nav + role toggle (admins only) + bell + cart + user ── */}
        <div className="flex items-center gap-3 h-full">

          {/* Nav links — signed-in students and admins */}
          <Show when="signed-in">
            <nav className="hidden lg:flex items-center gap-1">
              <Link
                href="/catalog"
                className="px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
              >
                Catalog
              </Link>
              <Link
                href="/my-learning"
                className="px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
              >
                My learning
              </Link>
            </nav>
          </Show>

          {/* Browse catalog link for signed-out visitors */}
          <Show when="signed-out">
            <Link
              href="/catalog"
              className="hidden lg:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse catalog
            </Link>
          </Show>

          {/* ── Admin role toggle — ONLY visible to admin accounts ── */}
          {isAdmin && (
            <div className="hidden lg:flex items-center gap-0.5 bg-secondary/60 border border-border rounded-full p-1">
              <button
                onClick={() => { setRole("student"); setLocation("/"); }}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  role === "student"
                    ? "bg-white shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Student
              </button>
              <button
                onClick={() => { setRole("admin"); setLocation("/admin"); }}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  role === "admin"
                    ? "bg-primary shadow text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </button>
            </div>
          )}

          {/* Notification bell — signed-in only */}
          <Show when="signed-in">
            <NotificationBell />
          </Show>

          {/* Cart */}
          <Show when="signed-in">
            <button
              onClick={() => setCartOpen(true)}
              className="relative w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartItemCount}
                </span>
              )}
            </button>
          </Show>

          {/* User menu / sign-in prompt */}
          <Show when="signed-in">
            <UserMenu />
          </Show>
          <Show when="signed-out">
            <SignInPrompt />
          </Show>
        </div>
      </header>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
