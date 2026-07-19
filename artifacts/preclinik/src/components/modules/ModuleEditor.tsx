import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Module, ModuleInput, ModuleUpdate, useCreateModule, useUpdateModule, getListModulesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  id: z.string().min(1, 'ID (slug) is required'),
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  year: z.string().min(1, 'Year is required'),
  level: z.string().min(1, 'Level is required'),
  duration: z.string().min(1, 'Duration is required'),
  provider: z.string().min(1, 'Provider is required'),
  icon: z.string().min(1, 'Icon is required'),
  status: z.enum(['Live', 'Draft']),
  price: z.coerce.number().min(0),
  rating: z.coerce.number().min(0).max(5),
  students: z.coerce.number().min(0),
  summary: z.string().min(1, 'Summary is required'),
  outcomes: z.array(z.string()),
  gradient: z.string().optional()
});

type FormData = z.infer<typeof schema>;

interface ModuleEditorProps {
  module: Module | null;
  onClose: () => void;
  onCreated?: (module: Module) => void;
}

export function ModuleEditor({ module, onClose, onCreated }: ModuleEditorProps) {
  const queryClient = useQueryClient();
  const isEditing = !!module;
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: module?.id || '',
      title: module?.title || '',
      category: module?.category || 'Anatomy',
      year: module?.year || '1',
      level: module?.level || 'Beginner',
      duration: module?.duration || '4 weeks',
      provider: module?.provider || 'PreClinik Faculty',
      icon: module?.icon || 'heart',
      status: module?.published ? 'Live' : 'Draft',
      price: module?.price || 800,
      rating: module?.rating || 4.5,
      students: module?.students || 0,
      summary: module?.summary || '',
      outcomes: module?.outcomes || ['Understand core concepts', 'Apply clinical reasoning'],
      gradient: module?.gradient || 'linear-gradient(135deg, #8b1a2f, #b9852e)'
    }
  });

  const createMut = useCreateModule();
  const updateMut = useUpdateModule();

  const onSubmit = (data: FormData) => {
    const payload: ModuleInput = {
      id: data.id,
      title: data.title,
      category: data.category,
      year: data.year,
      level: data.level,
      duration: data.duration,
      provider: data.provider,
      icon: data.icon,
      published: data.status === 'Live',
      price: data.price,
      rating: data.rating,
      students: data.students,
      summary: data.summary,
      outcomes: data.outcomes,
      gradient: data.gradient
    };

    if (isEditing) {
      updateMut.mutate({ moduleId: module.id, data: payload as ModuleUpdate }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListModulesQueryKey() });
          toast.success("Module updated");
          onClose();
        }
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getListModulesQueryKey() });
          toast.success("Module created");
          onCreated?.(created);
          onClose();
        }
      });
    }
  };

  const watchOutcomes = form.watch('outcomes');

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[980px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
          <h2 className="font-serif text-2xl font-bold">{isEditing ? 'Edit Module' : 'New Module'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <form id="module-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">ID (Slug)</label>
                <input {...form.register('id')} disabled={isEditing} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50" />
                {form.formState.errors.id && <span className="text-red-500 text-xs">{form.formState.errors.id.message}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Title</label>
                <input {...form.register('title')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Category</label>
                <input {...form.register('category')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Year (1-7)</label>
                <select {...form.register('year')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all">
                  {[1,2,3,4,5,6,7].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Level</label>
                <select {...form.register('level')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Status</label>
                <select {...form.register('status')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all">
                  <option value="Live">Live</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Provider</label>
                <input {...form.register('provider')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Duration</label>
                <input {...form.register('duration')} placeholder="e.g. 5 weeks" className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Icon</label>
                <select {...form.register('icon')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all">
                  <option value="heart">Heart (Cardio/Physio)</option>
                  <option value="brain">Brain (Neuro/Anatomy)</option>
                  <option value="dna">DNA (Biochem/Genetics)</option>
                  <option value="lungs">Lungs (Respiratory)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Price (DZD)</label>
                <input type="number" {...form.register('price')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Summary</label>
              <textarea {...form.register('summary')} rows={3} className="w-full p-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Learning Outcomes</label>
                <button type="button" onClick={() => form.setValue('outcomes', [...watchOutcomes, ''])} className="text-primary text-sm font-bold flex items-center gap-1">
                  <Plus className="w-4 h-4"/> Add Outcome
                </button>
              </div>
              <div className="space-y-2">
                {watchOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      value={outcome}
                      onChange={(e) => {
                        const newOutcomes = [...watchOutcomes];
                        newOutcomes[idx] = e.target.value;
                        form.setValue('outcomes', newOutcomes);
                      }}
                      className="flex-1 h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" 
                    />
                    <button type="button" onClick={() => form.setValue('outcomes', watchOutcomes.filter((_, i) => i !== idx))} className="p-3 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                      <Trash2 className="w-5 h-5"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground font-mono uppercase tracking-widest">Gradient CSS (Optional)</label>
              <input {...form.register('gradient')} className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-mono text-sm" />
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-border bg-secondary/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
          <button form="module-form" type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all">
            <Save className="w-5 h-5"/>
            {isEditing ? 'Save Changes' : 'Create Module'}
          </button>
        </div>
      </div>
    </>
  );
}
