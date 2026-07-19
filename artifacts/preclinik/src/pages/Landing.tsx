import { Link } from "wouter";
import {
  BookOpen,
  Brain,
  TrendingUp,
  ArrowRight,
  Play,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Structured modules",
    description:
      "Physiology, anatomy, biochemistry — organized by year and specialty, built around the Algerian medical curriculum.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Brain,
    title: "Q-bank per lesson",
    description:
      "Every video lesson has its own exam-style questions with detailed explanations and image support.",
    color: "bg-[#b9852e]/10 text-[#b9852e]",
  },
  {
    icon: TrendingUp,
    title: "Track your progress",
    description:
      "See exactly which lessons you've completed, where you left off, and your study streak at a glance.",
    color: "bg-green-50 text-green-700",
  },
];

const highlights = [
  "Cardiovascular Physiology",
  "Neuroanatomy Essentials",
  "Biochemistry & Metabolism",
  "Respiratory Physiology",
  "Renal Physiology",
  "Medical Histology",
];

export default function Landing() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f7f3ec" }}
    >
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-40 h-[72px] bg-white/80 backdrop-blur-md border-b border-[#e8ddd5] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#b9852e] flex items-center justify-center text-white font-bold font-serif text-xl shadow-sm">
            P
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-serif font-bold text-lg leading-tight text-foreground">
              PreClinik
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono leading-none">
              Medical Modules
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/catalog"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Browse catalog
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
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
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center">
        <section className="w-full max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Now available for Year 1–3 students
          </div>

          <h1
            className="text-5xl sm:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6"
            style={{ fontFamily: "Manrope, Inter, sans-serif" }}
          >
            Preclinical medicine,{" "}
            <span className="text-primary">finally structured.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
            Video lessons, five-option Q-banks, and progress tracking — built
            around the Algerian medical curriculum and designed for how you
            actually study.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            {/* Primary: Google — most prominent */}
            <Link
              href="/sign-up"
              className="group flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-[#f7f3ec] border-2 border-[#e8ddd5] hover:border-primary/30 rounded-xl font-bold text-foreground text-sm transition-all shadow-sm"
            >
              {/* Google logo */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
              <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Secondary: email sign-up */}
            <Link
              href="/sign-up"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-colors shadow-md shadow-primary/20"
            >
              Sign up with email
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-primary font-bold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>

        {/* ── Module highlights ── */}
        <section className="w-full max-w-4xl mx-auto px-6 pb-16">
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {highlights.map((h) => (
              <span
                key={h}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e8ddd5] text-xs font-mono font-bold text-foreground shadow-sm"
              >
                <CheckCircle className="w-3 h-3 text-green-600" />
                {h}
              </span>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground font-mono">
            + more modules added every semester
          </p>
        </section>

        {/* ── Features ── */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-[22px] border border-[#e8ddd5] p-6 shadow-sm"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Footer CTA ── */}
        <section className="w-full border-t border-[#e8ddd5] bg-white py-12 px-6 text-center">
          <h2
            className="text-2xl font-bold text-foreground mb-3"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Start learning today — it's free to browse.
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Create an account to track your progress and unlock full module
            access.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors shadow-md shadow-primary/20"
          >
            <Play className="w-4 h-4" />
            Get started free
          </Link>
        </section>
      </main>
    </div>
  );
}
