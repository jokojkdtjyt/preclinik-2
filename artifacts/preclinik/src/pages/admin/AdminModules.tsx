import React, { useState } from 'react';
import { Module, useListModules, useDeleteModule, getListModulesQueryKey } from '@workspace/api-client-react';
import { ModuleEditor } from '@/components/modules/ModuleEditor';
import { Plus, Edit2, Trash2, Library } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function AdminModules() {
  const { data: modules, isLoading } = useListModules();
  const deleteMut = useDeleteModule();
  const queryClient = useQueryClient();

  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleEdit = (mod: Module) => {
    setEditingModule(mod);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingModule(null);
    setIsEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this module completely?')) {
      deleteMut.mutate({ moduleId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListModulesQueryKey() });
          toast.success("Module deleted");
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Manage Modules</h1>
          <p className="text-muted-foreground">Create and update course offerings.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4"/> New Module
        </button>
      </div>

      <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
                <th className="p-5 font-bold">Module</th>
                <th className="p-5 font-bold">Category</th>
                <th className="p-5 font-bold">Year</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold">Price</th>
                <th className="p-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground font-mono">Loading...</td></tr>
              ) : modules?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Library className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                    <p className="text-foreground font-bold">No modules found.</p>
                    <p className="text-muted-foreground text-sm mt-1">Create your first module to get started.</p>
                  </td>
                </tr>
              ) : (
                modules?.map(mod => (
                  <tr key={mod.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-5">
                      <div className="font-bold text-foreground text-sm mb-1">{mod.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{mod.lessonCount} Lessons</div>
                    </td>
                    <td className="p-5 text-sm text-foreground">{mod.category}</td>
                    <td className="p-5 text-sm text-foreground font-mono">Y{mod.year}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono border ${mod.published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        {mod.published ? 'Live' : 'Draft'}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-mono font-bold text-foreground">{mod.price} DZD</td>
                    <td className="p-5 text-right space-x-2">
                      <button onClick={() => handleEdit(mod)} className="p-2 text-muted-foreground hover:bg-white hover:text-primary rounded-lg transition-colors border border-transparent hover:border-border shadow-sm">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(mod.id)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors border border-transparent">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditorOpen && (
        <ModuleEditor 
          module={editingModule} 
          onClose={() => setIsEditorOpen(false)} 
        />
      )}
    </div>
  );
}
