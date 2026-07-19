import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Lesson,
  LessonInput,
  LessonUpdate,
  useCreateLesson,
  useUpdateLesson,
  useListModules,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  listQuestions,
  getListLessonsQueryKey,
  getListQuestionsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { startUpload } from '@/lib/uploadManager';
import {
  X, Save, Plus, Upload, ChevronDown, ChevronUp,
  Trash2, Copy, Film, BookOpen, AlertCircle, Video, FileText, HelpCircle,
  CheckCircle2, Loader2, CloudUpload,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Local Q-bank types ────────────────────────────────────────────────────

let _localIdCounter = 0;
function nextLocalId() { return `local-${++_localIdCounter}`; }

interface LocalQuestion {
  localId: string;
  serverQId?: number;
  q: string;
  options: [string, string, string, string, string];
  correct: number; // 0–4
  comment: string;
  imageName: string;
  imageFile?: File;
  expanded: boolean;
  saved: boolean;
}

function blankQuestion(): LocalQuestion {
  return {
    localId: nextLocalId(),
    q: '',
    options: ['', '', '', '', ''],
    correct: 0,
    comment: '',
    imageName: '',
    expanded: true,
    saved: false,
  };
}

// ─── Main form schema ──────────────────────────────────────────────────────

interface VideoFormData {
  title: string;
  duration: string;
  type: 'Video' | 'Reading' | 'Quiz';
  published: boolean;
  videoTitle: string;
  videoUrl: string;
  summary: string;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ContextCard({ moduleId, modules }: { moduleId: string; modules: any[] }) {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/60 border border-border mb-6">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <BookOpen className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Module context</div>
        <div className="font-bold text-foreground text-sm truncate">{mod.title}</div>
      </div>
      {mod.year && (
        <div className="ml-auto shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold">
          Year {mod.year}
        </div>
      )}
    </div>
  );
}

// ─── Bunny video uploader ──────────────────────────────────────────────────

interface BunnyUploaderProps {
  lessonId: string | null;
  moduleId: string;
  lessonTitle: string;
  existingBunnyVideoId: string | null;
  onFileStaged: (file: File | null) => void;
  getToken: () => Promise<string | null>;
}

function BunnyUploader({
  lessonId,
  moduleId,
  lessonTitle,
  existingBunnyVideoId,
  onFileStaged,
  getToken,
}: BunnyUploaderProps) {
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [currentBunnyId, setCurrentBunnyId] = useState<string | null>(existingBunnyVideoId);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentBunnyId(existingBunnyVideoId); }, [existingBunnyVideoId]);

  const handleFile = (file: File) => { setStagedFile(file); onFileStaged(file); };

  /** Upload immediately (for existing lessons) — fire-and-forget via global manager. */
  const handleUploadNow = async () => {
    if (!stagedFile || !lessonId) return;
    const token = await getToken();
    startUpload({ lessonId, moduleId, lessonTitle, file: stagedFile, token });
    setStagedFile(null);
    onFileStaged(null);
    toast.info('Upload started — watch the progress bar at the bottom of the screen');
  };

  // ── Already has a video ──
  if (currentBunnyId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-green-800">Video uploaded to Bunny Stream</div>
            <div className="text-xs font-mono text-green-600 truncate">ID: {currentBunnyId}</div>
          </div>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="ml-auto shrink-0 text-xs font-bold text-green-700 hover:underline">
            Replace
          </button>
        </div>
        <input ref={fileRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        {stagedFile && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <CloudUpload className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-mono text-amber-800 truncate flex-1">{stagedFile.name}</span>
            {lessonId
              ? <button type="button" onClick={handleUploadNow}
                  className="shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors">
                  Upload now
                </button>
              : <span className="shrink-0 text-xs text-amber-600 font-mono">Will upload on save</span>
            }
          </div>
        )}
      </div>
    );
  }

  // ── No video yet ──
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all text-center cursor-pointer">
        <CloudUpload className="w-7 h-7 text-muted-foreground" />
        {stagedFile
          ? <span className="text-sm font-mono font-bold text-primary">{stagedFile.name}</span>
          : <span className="text-sm text-muted-foreground font-mono">Click to choose a video file</span>
        }
        <span className="text-xs text-muted-foreground font-mono">MP4 · MOV · WebM</span>
      </button>
      <input ref={fileRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      {stagedFile && (
        <div className="flex items-center gap-2 flex-wrap">
          {lessonId
            ? <button type="button" onClick={handleUploadNow}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                <CloudUpload className="w-4 h-4" /> Upload to Bunny now
              </button>
            : <span className="text-xs font-mono text-muted-foreground px-3 py-2 rounded-xl bg-secondary border border-border">
                ✓ Staged — will upload to Bunny after lesson is saved
              </span>
          }
          <button type="button" onClick={() => { setStagedFile(null); onFileStaged(null); }}
            className="px-3 py-2 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors">
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionItem({
  q, index, total,
  onChange, onRemove, onDuplicate,
}: {
  q: LocalQuestion; index: number; total: number;
  onChange: (updated: LocalQuestion) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const update = (patch: Partial<LocalQuestion>) => onChange({ ...q, ...patch });
  const setOption = (i: number, val: string) => {
    const opts = [...q.options] as [string, string, string, string, string];
    opts[i] = val;
    update({ options: opts });
  };
  const handleCollapse = () => update({ saved: true, expanded: false });
  const handleSave = () => {
    if (!q.q.trim()) { toast.error('Question text cannot be empty'); return; }
    update({ saved: true, expanded: false });
  };
  const imgRef = useRef<HTMLInputElement>(null);

  // ── Collapsed/saved view ──
  if (q.saved && !q.expanded) {
    const correctLabel = q.options[q.correct] || `Option ${String.fromCharCode(65 + q.correct)}`;
    return (
      <div
        className="group rounded-xl border border-border bg-white hover:border-primary/30 transition-all cursor-pointer"
        onClick={() => update({ expanded: true })}
      >
        <div className="p-4 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-mono font-bold">Q{index + 1}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
              {q.q || <span className="text-muted-foreground italic">No question text</span>}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-mono font-bold border border-green-200">
                ✓ {correctLabel.slice(0, 40)}{correctLabel.length > 40 ? '…' : ''}
              </span>
              {q.imageName && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono border border-blue-200">
                  📎 {q.imageName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button type="button" onClick={(e) => { e.stopPropagation(); update({ expanded: true }); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors text-xs font-bold">Edit</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><Copy className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded/editing view ──
  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">
          {q.saved ? `Editing question ${index + 1}` : `New question ${index + 1}`}
        </span>
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Question text */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Question text</label>
          <textarea
            value={q.q}
            onChange={(e) => update({ q: e.target.value })}
            rows={3}
            placeholder="Write the clinical or exam-style question here"
            className="w-full p-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none text-sm"
          />
        </div>

        {/* 5 answer options */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Answer options — select the correct one</label>
          {optionLetters.map((letter, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${q.correct === i ? 'border-green-400 bg-green-50' : 'border-border bg-white hover:bg-secondary/30'}`}
            >
              <input
                type="radio"
                name={`correct-${q.localId}`}
                checked={q.correct === i}
                onChange={() => update({ correct: i })}
                className="accent-green-600 w-4 h-4 shrink-0"
              />
              <span className="w-6 shrink-0 text-xs font-mono font-bold text-muted-foreground">{letter}</span>
              <input
                type="text"
                value={q.options[i]}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${letter}`}
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          ))}
        </div>

        {/* Explanation */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Explanation / comment</label>
          <textarea
            value={q.comment}
            onChange={(e) => update({ comment: e.target.value })}
            rows={3}
            placeholder="Explain why the right answer is correct and why the distractors are wrong"
            className="w-full p-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none text-sm"
          />
        </div>

        {/* Optional image */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Attach image (optional)</label>
          <button
            type="button"
            onClick={() => imgRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 hover:bg-white/80 transition-all cursor-pointer"
          >
            <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className={`text-sm font-mono ${q.imageName ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {q.imageName || 'Attach ECG, histology, diagram, radiology image...'}
            </span>
          </button>
          <input
            ref={imgRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) update({ imageName: e.target.files[0].name, imageFile: e.target.files[0] });
            }}
          />
        </div>

        {/* Footer buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCollapse}
            className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
          >
            Collapse
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-sm"
          >
            Save Q{index + 1}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main LessonEditor component ───────────────────────────────────────────

interface LessonEditorProps {
  moduleId: string;
  lesson: Lesson | null;
  onClose: () => void;
}

export function LessonEditor({ moduleId, lesson, onClose }: LessonEditorProps) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const isEditing = !!lesson;

  const [activeTab, setActiveTab] = useState<'video' | 'qbank'>('video');
  const [qbank, setQbank] = useState<LocalQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  // Bunny video state
  const [stagedVideoFile, setStagedVideoFile] = useState<File | null>(null);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lesson?.id ?? null);
  const [bunnyVideoId, setBunnyVideoId] = useState<string | null>((lesson as any)?.bunnyVideoId ?? null);

  const { data: modules = [] } = useListModules();
  const createLessonMut = useCreateLesson();
  const updateLessonMut = useUpdateLesson();
  const createQMut = useCreateQuestion();
  const updateQMut = useUpdateQuestion();
  const deleteQMut = useDeleteQuestion();

  // Form
  const { register, handleSubmit, formState: { errors }, watch } = useForm<VideoFormData>({
    defaultValues: {
      title: lesson?.title || '',
      duration: lesson?.duration || '',
      type: (lesson?.type as 'Video' | 'Reading' | 'Quiz') || 'Video',
      published: lesson?.published ?? false,
      videoTitle: lesson?.videoTitle || '',
      videoUrl: lesson?.videoUrl || '',
      summary: lesson?.summary || '',
    },
  });
  const watchedTitle = watch('title');

  // Load existing questions when editing
  useEffect(() => {
    if (isEditing && lesson) {
      listQuestions(moduleId, lesson.id).then((serverQs) => {
        setQbank(
          serverQs.map((sq) => ({
            localId: nextLocalId(),
            serverQId: sq.id,
            q: sq.question,
            options: (sq.options as string[]).concat(['', '', '', '', '']).slice(0, 5) as [string, string, string, string, string],
            correct: sq.correct,
            comment: sq.comment || '',
            imageName: '',
            expanded: false,
            saved: true,
          }))
        );
      }).catch(() => {});
    }
  }, []);

  // Q-bank helpers
  const updateQ = useCallback((localId: string, updated: LocalQuestion) => {
    setQbank((prev) => prev.map((q) => q.localId === localId ? updated : q));
  }, []);

  const removeQ = useCallback((localId: string) => {
    setQbank((prev) => prev.filter((q) => q.localId !== localId));
  }, []);

  const duplicateQ = useCallback((localId: string) => {
    setQbank((prev) => {
      const idx = prev.findIndex((q) => q.localId === localId);
      if (idx === -1) return prev;
      const clone: LocalQuestion = {
        ...prev[idx],
        localId: nextLocalId(),
        serverQId: undefined,
        q: prev[idx].q + ' (copy)',
        expanded: true,
        saved: false,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const addQ = () => setQbank((prev) => [...prev, blankQuestion()]);

  // Save orchestration
  const onSave = async (formData: VideoFormData) => {
    setSaving(true);
    try {
      const lessonPayload: LessonInput = {
        id: lesson?.id || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36),
        title: formData.title,
        duration: formData.duration,
        type: formData.type,
        published: formData.published,
        summary: formData.summary,
        videoTitle: formData.videoTitle || formData.title,
        videoUrl: formData.videoUrl,
        sortOrder: lesson?.sortOrder ?? 99,
      };

      let resolvedLessonId: string;

      if (isEditing) {
        await updateLessonMut.mutateAsync({ moduleId, lessonId: lesson.id, data: lessonPayload as LessonUpdate });
        resolvedLessonId = lesson.id;
      } else {
        const created = await createLessonMut.mutateAsync({ moduleId, data: lessonPayload });
        resolvedLessonId = created.id;
        setSavedLessonId(resolvedLessonId);
      }

      // Kick off background upload (fire-and-forget — XHR lives in uploadManager,
      // not in this component, so closing the drawer won't cancel the transfer).
      if (stagedVideoFile) {
        const token = await getToken();
        startUpload({
          lessonId: resolvedLessonId,
          moduleId,
          lessonTitle: formData.title,
          file: stagedVideoFile,
          token,
        });
        setStagedVideoFile(null);
      }

      // Sync Q-bank
      const serverQs = await listQuestions(moduleId, resolvedLessonId).catch(() => [] as Awaited<ReturnType<typeof listQuestions>>);
      const serverQIds = new Set(serverQs.map((q) => q.id));
      const localServerQIds = new Set(qbank.filter((q) => q.serverQId != null).map((q) => q.serverQId!));

      // Delete removed questions
      const toDelete = serverQs.filter((sq) => !localServerQIds.has(sq.id));
      await Promise.all(toDelete.map((sq) =>
        deleteQMut.mutateAsync({ moduleId, lessonId: resolvedLessonId, questionId: sq.id })
      ));

      // Create or update local questions
      await Promise.all(qbank.map(async (q) => {
        const payload = {
          question: q.q || 'Question',
          options: q.options,
          correct: q.correct,
          comment: q.comment,
        };
        if (q.serverQId != null && serverQIds.has(q.serverQId)) {
          await updateQMut.mutateAsync({ moduleId, lessonId: resolvedLessonId, questionId: q.serverQId, data: payload });
        } else if (!q.serverQId) {
          await createQMut.mutateAsync({ moduleId, lessonId: resolvedLessonId, data: payload });
        }
      }));

      queryClient.invalidateQueries({ queryKey: getListLessonsQueryKey(moduleId) });
      queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(moduleId, resolvedLessonId) });
      toast.success(isEditing ? 'Lesson updated' : 'Lesson created');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const lessonType = watch('type');

  // ── Render ──
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[680px] max-w-[95vw] bg-background shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="shrink-0 px-7 py-5 border-b border-border flex items-start justify-between bg-white">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              {isEditing ? 'Edit lesson' : 'Add lesson'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Build the video lesson and its lesson-specific Q-bank in one place.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="shrink-0 px-7 pt-4 pb-0 bg-white border-b border-border">
          <div className="flex gap-1">
            {([['video', Film, '1. Video details'], ['qbank', HelpCircle, '2. Lesson Q-bank']] as const).map(([tab, Icon, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
                  activeTab === tab
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <form id="lesson-save-form" onSubmit={handleSubmit(onSave)}>

            {/* ── TAB 1: Video details ── */}
            {activeTab === 'video' && (
              <div className="p-7 space-y-6">
                {/* Context card */}
                <ContextCard moduleId={moduleId} modules={modules} />

                {/* 1. Lesson name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Lesson name</label>
                  <input
                    {...register('title', { required: 'Lesson name is required' })}
                    placeholder="Write the lesson name here — e.g. Wiggers diagram and valve events"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                  />
                  {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
                </div>

                {/* 2+3. Duration + Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Duration</label>
                    <input
                      {...register('duration', { required: 'Duration is required' })}
                      placeholder="18 min"
                      className="w-full h-12 px-4 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                    />
                    {errors.duration && <p className="text-red-500 text-xs">{errors.duration.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Type</label>
                    <select
                      {...register('type')}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                    >
                      <option value="Video">📹  Video</option>
                      <option value="Reading">📖  Reading</option>
                      <option value="Quiz">❓  Quiz</option>
                    </select>
                  </div>
                </div>

                {/* 4. Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                  <select
                    {...register('published', { setValueAs: (v) => v === 'true' || v === true })}
                    defaultValue={lesson?.published ? 'true' : 'false'}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                  >
                    <option value="true">🟢  Live — visible to students</option>
                    <option value="false">🟡  Draft — hidden from students</option>
                  </select>
                </div>

                {/* 5. Video display title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Video display title</label>
                  <input
                    {...register('videoTitle')}
                    placeholder="The title shown on the video player (defaults to Lesson name if empty)"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                  />
                </div>

                {/* 6. Upload video to Bunny Stream */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    Video file — Bunny Stream
                  </label>
                  <BunnyUploader
                    lessonId={savedLessonId}
                    moduleId={moduleId}
                    lessonTitle={watchedTitle || lesson?.title || 'Lesson'}
                    existingBunnyVideoId={bunnyVideoId}
                    onFileStaged={(f) => setStagedVideoFile(f)}
                    getToken={getToken}
                  />
                </div>

                {/* 7. Lesson description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Lesson description / notes</label>
                  <textarea
                    {...register('summary')}
                    rows={4}
                    placeholder="What should the student understand after this video?"
                    className="w-full p-4 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Professional workflow notice */}
                <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold">Professional workflow —</span> Save as Draft while preparing. Upload the video file, then switch Status to Live when ready. Only Live lessons appear in the student playlist.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB 2: Q-bank ── */}
            {activeTab === 'qbank' && (
              <div className="p-7 space-y-4">
                {/* Q-bank header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-foreground">Lesson-specific Q-bank</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Questions added here appear only under this video's Q-bank tab.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addQ}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Q
                  </button>
                </div>

                {/* Empty state */}
                {qbank.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center space-y-3">
                    <HelpCircle className="w-10 h-10 text-muted-foreground opacity-30 mx-auto" />
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      No questions yet. Click <strong>Add Q</strong> to create a five-option question, mark the correct answer, add an explanation, and optionally attach an image.
                    </p>
                  </div>
                )}

                {/* Question list */}
                <div className="space-y-3">
                  {qbank.map((q, i) => (
                    <QuestionItem
                      key={q.localId}
                      q={q}
                      index={i}
                      total={qbank.length}
                      onChange={(updated) => updateQ(q.localId, updated)}
                      onRemove={() => removeQ(q.localId)}
                      onDuplicate={() => duplicateQ(q.localId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-7 py-5 border-t border-border bg-white flex items-center justify-between gap-3">
          {/* Tab quick-toggle */}
          <button
            type="button"
            onClick={() => setActiveTab((t) => t === 'video' ? 'qbank' : 'video')}
            className="text-sm font-bold text-primary hover:underline hidden sm:block"
          >
            {activeTab === 'video' ? '→ Go to Q-bank' : '← Go to Video details'}
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              form="lesson-save-form"
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : (isEditing ? 'Save changes' : 'Create lesson')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
