import React from 'react';
import { useListModules, useGetProgress } from '@workspace/api-client-react';
import { ModuleCard } from '@/components/modules/ModuleCard';
import { Link } from 'wouter';
import { PlayCircle, BookOpen, Target } from 'lucide-react';

export default function Dashboard() {
  const { data: modules, isLoading } = useListModules({ published: true });
  const { data: progress } = useGetProgress();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-12">
        <div className="h-40 bg-white rounded-[22px] border border-border"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-80 bg-white rounded-[22px] border border-border"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-16">
      <section>
        <div className="bg-white rounded-[22px] p-8 md:p-12 border border-border shadow-sm flex items-center justify-between overflow-hidden relative" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--ink) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className="relative z-10 max-w-2xl space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Welcome back, Doctor.</h1>
            <p className="text-lg text-muted-foreground">Your preclinical journey continues. You have 3 lessons in progress and a new anatomy module is available.</p>
            <div className="pt-4">
              <Link href="/my-learning" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-primary/20">
                <PlayCircle className="w-5 h-5" />
                Resume Learning
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[22px] border border-border flex items-start gap-4 hover:-translate-y-1 transition-transform" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center text-[#b9852e] shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Modules Owned</h4>
            <div className="text-3xl font-serif font-bold">12</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[22px] border border-border flex items-start gap-4 hover:-translate-y-1 transition-transform" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Lessons Completed</h4>
            <div className="text-3xl font-serif font-bold">{progress ? Object.values(progress).filter(Boolean).length : 0}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[22px] border border-border flex items-start gap-4 hover:-translate-y-1 transition-transform" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-700 shrink-0">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Study Streak</h4>
            <div className="text-3xl font-serif font-bold">5 Days</div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Popular in Preclinical</h2>
            <p className="text-muted-foreground mt-1">Foundation modules highly rated by year 1 & 2 students</p>
          </div>
          <Link href="/catalog" className="hidden sm:flex items-center gap-2 text-primary font-bold hover:underline">
            See all catalog
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules?.slice(0, 6).map(module => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>
    </div>
  );
}
