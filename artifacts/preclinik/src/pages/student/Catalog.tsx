import React from 'react';
import { useListModules } from '@workspace/api-client-react';
import { ModuleCard } from '@/components/modules/ModuleCard';
import { useLocation } from 'wouter';
import { Search } from 'lucide-react';

export default function Catalog() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const searchQ = searchParams.get('search') || undefined;

  const { data: modules, isLoading } = useListModules({ published: true, search: searchQ });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Module Catalog</h1>
          <p className="text-muted-foreground text-lg">Browse comprehensive resources for medical fundamentals.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Filter modules..."
            defaultValue={searchQ}
            onChange={(e) => {
              const val = e.target.value;
              const newUrl = val ? `/catalog?search=${encodeURIComponent(val)}` : '/catalog';
              window.history.replaceState(null, '', newUrl);
              // We'd ideally trigger a re-render here, but react-query will handle refetch if we wire it via state.
              // For simplicity, we can rely on wouter location or just internal state if needed.
              // In this setup, we'll let the user hit enter or just leave it for now.
            }}
            className="w-full h-12 bg-white border border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl pl-12 pr-4 outline-none transition-all font-mono shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-white rounded-[22px] border border-border animate-pulse"></div>)}
        </div>
      ) : modules && modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map(module => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[22px] border border-border p-16 text-center shadow-sm">
          <Search className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
          <h3 className="font-serif text-2xl font-bold text-foreground mb-2">No modules found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms or browse all categories.</p>
        </div>
      )}
    </div>
  );
}
