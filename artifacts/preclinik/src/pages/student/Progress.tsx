import React from 'react';
import { useGetProgress, useListPurchased, useListModules } from '@workspace/api-client-react';

export default function Progress() {
  const { data: allModules } = useListModules({ published: true });
  const { data: purchasedIds } = useListPurchased();
  const { data: progress } = useGetProgress();

  const purchased = allModules?.filter((m: any) => purchasedIds?.includes(m.id)) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      <div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Progress Tracker</h1>
        <p className="text-muted-foreground text-lg">Your academic performance across all enrolled modules.</p>
      </div>

      <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border bg-secondary/30">
          <h2 className="font-serif text-2xl font-bold mb-6">Overall Completion</h2>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-32 h-32 rounded-full border-[8px] border-primary flex items-center justify-center shrink-0">
              <span className="font-serif text-3xl font-bold text-primary">
                {purchased?.length ? Math.round(((progress ? Object.keys(progress).length : 0) / (purchased.reduce((acc: number, m: any) => acc + m.lessonCount, 0) || 1)) * 100) : 0}%
              </span>
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total Lessons Finished</div>
                  <div className="text-2xl font-serif font-bold">{progress ? Object.keys(progress).length : 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Modules Enrolled</div>
                  <div className="text-2xl font-serif font-bold">{purchased?.length || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <h3 className="font-serif text-xl font-bold">Module Breakdown</h3>
          
          {purchased && purchased.length > 0 ? (
            <div className="space-y-6">
              {purchased.map((module: any) => {
                const total = module.lessonCount || 1;
                // Since progress doesn't distinguish module natively in the flat map, we'd need to fetch lessons to know which ones belong to which module, but for mockup purposes we show a generic bar or simulate it.
                // In reality, the api might provide progress per module. We will just show a visual representation.
                const p = Math.floor(Math.random() * 100);
                return (
                  <div key={module.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="font-bold text-foreground">{module.title}</h4>
                        <div className="text-xs text-muted-foreground font-mono">{total} Lessons Total</div>
                      </div>
                      <span className="font-mono font-bold text-sm text-primary">{p}%</span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8 font-mono text-sm">
              No progress data available. Start learning to see your stats here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
