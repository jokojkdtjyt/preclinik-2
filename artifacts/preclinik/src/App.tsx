import { useEffect, useRef, useState } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useAuth,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Route, Switch, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter, setExtraHeaders } from "@workspace/api-client-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { GlobalUploadBanner } from "@/components/GlobalUploadBanner";

// Shells
import { StudentShell } from "@/components/layout/StudentShell";
import { AdminShell } from "@/components/layout/AdminShell";

// Student Pages
import Dashboard from "@/pages/student/Dashboard";
import Catalog from "@/pages/student/Catalog";
import MyLearning from "@/pages/student/MyLearning";
import Progress from "@/pages/student/Progress";
import ModuleDetail from "@/pages/student/ModuleDetail";
import LessonPlayer from "@/pages/student/LessonPlayer";

// Admin Pages
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminModules from "@/pages/admin/AdminModules";
import AdminLessons from "@/pages/admin/AdminLessons";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminPurchaseRequests from "@/pages/admin/AdminPurchaseRequests";

// Auth + Landing pages
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

// ─── Clerk setup (copy verbatim per skill instructions) ───────────────────────

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Resolves the key from window.location.hostname — same build serves multiple
// Clerk custom domains. Do NOT use the raw env var or window.location.host.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Empty in dev (intentional); auto-set in prod. Do NOT gate on NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

// Clerk passes full paths; wouter's setLocation prepends base — strip it.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// ─── Appearance — PreClinik brand ────────────────────────────────────────────

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    // Google first — the most prominent option
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#8b1a2f",
    colorForeground: "#1a1211",
    colorMutedForeground: "#6b5a52",
    colorDanger: "#dc2626",
    colorBackground: "#f7f3ec",
    colorInput: "#ffffff",
    colorInputForeground: "#1a1211",
    colorNeutral: "#c4b5aa",
    fontFamily: "'Inter', 'Manrope', sans-serif",
    borderRadius: "10px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white rounded-[22px] shadow-2xl w-[440px] max-w-full overflow-hidden border border-[#e8ddd5]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle:
      "font-bold text-2xl text-[#1a1211] font-['Manrope',sans-serif]",
    headerSubtitle: "text-[#6b5a52] text-sm mt-1",
    socialButtonsBlockButtonText: "font-semibold text-[#1a1211] text-sm",
    formFieldLabel: "font-medium text-[#1a1211] text-sm",
    footerActionLink: "text-[#8b1a2f] font-bold",
    footerActionText: "text-[#6b5a52] text-sm",
    dividerText: "text-[#6b5a52] text-xs",
    identityPreviewEditButton: "text-[#8b1a2f]",
    formFieldSuccessText: "text-green-700",
    alertText: "text-red-700",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton:
      "border border-[#e8ddd5] bg-white hover:bg-[#f7f3ec] transition-colors",
    formButtonPrimary:
      "bg-[#8b1a2f] hover:bg-[#7a1628] text-white font-bold rounded-xl",
    formFieldInput:
      "border border-[#e8ddd5] rounded-xl bg-white text-[#1a1211]",
    footerAction: "bg-[#f7f3ec]/80 border-t border-[#e8ddd5]",
    dividerLine: "bg-[#e8ddd5]",
    alert: "border border-red-200 bg-red-50 rounded-xl",
    otpCodeFieldInput: "border border-[#e8ddd5] rounded-xl",
  },
};

// ─── Auth pages ───────────────────────────────────────────────────────────────

function SignInPage() {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,26,47,0.10) 0%, transparent 70%), #f7f3ec",
      }}
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,26,47,0.10) 0%, transparent 70%), #f7f3ec",
      }}
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// ─── Route protection ─────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

/**
 * AdminRoute — requires both a valid Clerk session AND the user's email being
 * in the `admins` table. Non-admins are redirected to "/" silently.
 * Shows nothing while the role check is still loading.
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { data: roleData, isLoading: roleLoading } = useIsAdmin();
  const [, setLocation] = useLocation();

  // Wait for Clerk to resolve the session
  if (!authLoaded) return null;

  // Not signed in at all — redirect to sign-in
  if (!isSignedIn) {
    setLocation("/sign-in");
    return null;
  }

  // Waiting for the admin check
  if (roleLoading) return null;

  // Signed in but not an admin — bounce to dashboard
  if (!roleData?.isAdmin) {
    setLocation("/");
    return null;
  }

  return <>{children}</>;
}

// ─── Wire Clerk session token into every API fetch ───────────────────────────
// Without this, POST/DELETE mutations silently get 401s even when the user is
// signed in, because customFetch doesn't attach the Bearer token by default.

function ClerkTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

// ─── Cache invalidation on user change ───────────────────────────────────────

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

// ─── Main router ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

function AppRoutes() {
  const [role, setRole] = useState<"student" | "admin">("student");
  const { data: roleData } = useIsAdmin();
  const isAdmin = roleData?.isAdmin ?? false;
  const queryClient = useQueryClient();

  // When an admin switches to Student view, inject a header so all API calls
  // (generated hooks + raw fetches) treat them as a regular student:
  // draft lessons hidden, no ownership bypass on play-url.
  useEffect(() => {
    if (isAdmin && role === "student") {
      setExtraHeaders({ "x-preview-as-student": "true" });
    } else {
      setExtraHeaders({});
    }
    // Flush cached data queries so they re-fetch under the new context.
    // Deliberately exclude /api/me/role: including it creates a feedback loop
    // where invalidating the role query can change isAdmin, which re-runs
    // this effect, which invalidates again — and any transient DB error in
    // the catch block would cache { isAdmin: false } as a clean 200 response,
    // permanently hiding the admin toggle for 5 minutes.
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== "/api/me/role",
    });
  }, [isAdmin, role, queryClient]);

  return (
    <Switch>
      {/* Home: public landing → signed-in users see Dashboard */}
      <Route path="/">
        <>
          <Show when="signed-in">
            <StudentShell role={role} setRole={setRole}>
              <Dashboard />
            </StudentShell>
          </Show>
          <Show when="signed-out">
            <Landing />
          </Show>
        </>
      </Route>

      {/* Clerk auth pages — MUST use /*? wildcard */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Public: module catalog (browsing is free) */}
      <Route path="/catalog">
        <StudentShell role={role} setRole={setRole}>
          <Catalog />
        </StudentShell>
      </Route>

      {/* Public: module detail (purchasing requires auth — handled in component) */}
      <Route path="/modules/:id">
        <StudentShell role={role} setRole={setRole}>
          <ModuleDetail />
        </StudentShell>
      </Route>

      {/* Protected: personal student routes */}
      <Route path="/my-learning">
        <ProtectedRoute>
          <StudentShell role={role} setRole={setRole}>
            <MyLearning />
          </StudentShell>
        </ProtectedRoute>
      </Route>

      <Route path="/progress">
        <ProtectedRoute>
          <StudentShell role={role} setRole={setRole}>
            <Progress />
          </StudentShell>
        </ProtectedRoute>
      </Route>

      <Route path="/modules/:moduleId/lessons/:lessonId">
        <ProtectedRoute>
          <StudentShell role={role} setRole={setRole}>
            <LessonPlayer />
          </StudentShell>
        </ProtectedRoute>
      </Route>

      {/* Protected: admin-only panel — server-side AND client-side enforced */}
      <Route path="/admin">
        <AdminRoute>
          <AdminShell role={role} setRole={setRole}>
            <AdminOverview />
          </AdminShell>
        </AdminRoute>
      </Route>
      <Route path="/admin/modules">
        <AdminRoute>
          <AdminShell role={role} setRole={setRole}>
            <AdminModules />
          </AdminShell>
        </AdminRoute>
      </Route>
      <Route path="/admin/lessons">
        <AdminRoute>
          <AdminShell role={role} setRole={setRole}>
            <AdminLessons />
          </AdminShell>
        </AdminRoute>
      </Route>
      <Route path="/admin/students">
        <AdminRoute>
          <AdminShell role={role} setRole={setRole}>
            <AdminStudents />
          </AdminShell>
        </AdminRoute>
      </Route>
      <Route path="/admin/settings">
        <AdminRoute>
          <AdminShell role={role} setRole={setRole}>
            <AdminSettings />
          </AdminShell>
        </AdminRoute>
      </Route>
      <Route path="/admin/purchases">
        <AdminRoute>
          <AdminShell role={role} setRole={setRole}>
            <AdminPurchaseRequests />
          </AdminShell>
        </AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// ─── Clerk provider (needs useLocation from wouter, so lives inside WouterRouter) ──

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back, Doctor.",
            subtitle: "Sign in to continue your preclinical journey",
          },
        },
        signUp: {
          start: {
            title: "Join PreClinik",
            subtitle: "The medical platform built for Algerian students",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkTokenSync />
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <GlobalUploadBanner />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
