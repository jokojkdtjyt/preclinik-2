import React from 'react';
import { useListPurchased, useListModules } from '@workspace/api-client-react';
import { ModuleCard } from '@/components/modules/ModuleCard';
import { Library } from 'lucide-react';
import { Link } from 'wouter';

export default function MyLearning() {
  const { data: allModules, isLoading: modulesLoading } = useListModules({ published: true });
  const { data: purchasedIds, isLoading: purchasedLoading } = useListPurchased();

  // Only modules the student has paid for — no browsing, no prices.
  const modules = allModules?.filter(m => purchasedIds?.includes(m.id)) || [];
  const isLoading = modulesLoading || purchasedLoading;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      <div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">My Learning</h1>
        <p className="text-muted-foreground text-lg">Your purchased modules — pick up where you left off.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-80 bg-white rounded-[22px] border border-border animate-pulse" />
          ))}
        </div>
      ) : modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map(module => (
            // library variant: no price, no cart button — just "Continue Learning"
            <ModuleCard key={module.id} module={module} variant="library" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[22px] border border-border p-16 text-center shadow-sm max-w-2xl mx-auto mt-12">
          <Library className="w-16 h-16 text-primary opacity-20 mx-auto mb-6" />
          <h3 className="font-serif text-2xl font-bold text-foreground mb-4">
            You haven't unlocked any modules yet
          </h3>
          <p className="text-muted-foreground mb-8 text-lg">
            Browse the catalog, add a module to your cart, and check out to get started.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            Browse Catalog
          </Link>
        </div>
      )}
    </div>
  );
}
