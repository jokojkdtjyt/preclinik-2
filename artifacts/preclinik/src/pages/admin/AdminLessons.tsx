import React, { useState } from 'react';
import { Lesson, Module, useListModules, useListLessons, useDeleteLesson, getListLessonsQueryKey } from '@workspace/api-client-react';
import { LessonEditor } from '@/components/lessons/LessonEditor';
import { ModuleEditor } from '@/components/modules/ModuleEditor';
import { Edit2, Trash2, BookOpen, Plus, Library } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function AdminLessons() {
  const { data: modules, isLoading: modulesLoading } = useListModules();
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  const { data: lessons, isLoading: lessonsLoading } = useListLessons(selectedModuleId, {
    query: { enabled: !!selectedModuleId },
  });
  
  const deleteMut = useDeleteLesson();
  const queryClient = useQueryClient();

  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isModuleEditorOpen, setIsModuleEditorOpen] = useState(false);

  // Auto-select first module if none selected
  if (modules && modules.length > 0 && !selectedModuleId) {
    setSelectedModuleId(modules[0].id);
  }

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingLesson(null);
    setIsEditorOpen(true);
  };

  const handleDelete = (lessonId: string) => {
    if (confirm('Delete this lesson completely?')) {
      deleteMut.mutate({ moduleId: selectedModuleId, lessonId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey(selectedModuleId) });
          toast.success("Lesson deleted");
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Manage Lessons</h1>
          <p className="text-muted-foreground">Organize video, reading, and quiz content.</p>
        </div>
      </div>

      <div className="bg-white rounded-[22px] border border-border shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-end">
        <div className="flex-1 w-full space-y-2">
          <label className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-widest">Select Module</label>
          <select 
            value={selectedModuleId} 
            onChange={(e) => setSelectedModuleId(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
          >
            <option value="" disabled>Select a module to view lessons</option>
            {modules?.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => setIsModuleEditorOpen(true)}
            className="bg-white hover:bg-secondary border border-border text-foreground px-6 h-12 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Library className="w-4 h-4"/> Create Module
          </button>
          <button 
            onClick={handleCreate}
            disabled={!selectedModuleId}
            className="bg-primary hover:bg-primary/90 text-white px-6 h-12 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4"/> Add Lesson
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
                <th className="p-5 font-bold w-16">Ord.</th>
                <th className="p-5 font-bold">Lesson Title</th>
                <th className="p-5 font-bold">Type</th>
                <th className="p-5 font-bold">Duration</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!selectedModuleId ? (
                 <tr><td colSpan={6} className="p-16 text-center text-muted-foreground font-mono">Select a module above.</td></tr>
              ) : lessonsLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground font-mono">Loading lessons...</td></tr>
              ) : lessons?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                    <p className="text-foreground font-bold">No lessons found.</p>
                    <p className="text-muted-foreground text-sm mt-1">Add a lesson to this module.</p>
                  </td>
                </tr>
              ) : (
                lessons?.map(lesson => (
                  <tr key={lesson.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-5 text-sm font-mono font-bold text-muted-foreground text-center">
                      {lesson.sortOrder}
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-foreground text-sm mb-1">{lesson.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{lesson.summary || 'No summary'}</div>
                    </td>
                    <td className="p-5 text-sm text-foreground font-mono font-bold">{lesson.type}</td>
                    <td className="p-5 text-sm text-foreground font-mono">{lesson.duration}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono border ${lesson.published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        {lesson.published ? 'Published' : 'Hidden'}
                      </span>
                    </td>
                    <td className="p-5 text-right space-x-2">
                      <button onClick={() => handleEdit(lesson)} className="p-2 text-muted-foreground hover:bg-white hover:text-primary rounded-lg transition-colors border border-transparent hover:border-border shadow-sm">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(lesson.id)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors border border-transparent">
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

      {isEditorOpen && selectedModuleId && (
        <LessonEditor 
          moduleId={selectedModuleId}
          lesson={editingLesson} 
          onClose={() => setIsEditorOpen(false)} 
        />
      )}

      {isModuleEditorOpen && (
        <ModuleEditor
          module={null}
          onClose={() => setIsModuleEditorOpen(false)}
          onCreated={(created) => setSelectedModuleId(created.id)}
        />
      )}
    </div>
  );
}
