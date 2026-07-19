/**
 * GlobalUploadBanner — always-mounted, floating progress indicator.
 *
 * Subscribes to the module-level uploadManager. When an upload completes
 * it also invalidates the lesson list in React Query so the admin lesson
 * table refreshes without a manual reload.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  subscribe,
  getUploads,
  cancelUpload,
  dismissUpload,
  type UploadRecord,
} from "@/lib/uploadManager";
import { CheckCircle2, XCircle, X, CloudUpload, Loader2 } from "lucide-react";

function UploadRow({ record, onQueryInvalidated }: { record: UploadRecord; onQueryInvalidated: () => void }) {
  const queryClient = useQueryClient();

  // When this record flips to 'done', invalidate the lesson list so the
  // Bunny video ID badge appears in the admin table without a page reload.
  useEffect(() => {
    if (record.status === "done") {
      queryClient.invalidateQueries({
        queryKey: ["/api/modules", record.moduleId, "lessons"],
      });
      // Also bust any cached GET lesson response
      queryClient.invalidateQueries({
        queryKey: ["/api/modules", record.moduleId, "lessons", record.lessonId],
      });
      onQueryInvalidated();
    }
  }, [record.status]);

  const isDone = record.status === "done";
  const isError = record.status === "error";

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isDone
          ? "bg-green-50 border-green-200"
          : isError
          ? "bg-red-50 border-red-200"
          : "bg-white border-border shadow-sm"
      }`}
    >
      {/* Icon */}
      <div className="shrink-0">
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : isError ? (
          <XCircle className="w-5 h-5 text-red-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-bold truncate ${
            isDone ? "text-green-800" : isError ? "text-red-800" : "text-foreground"
          }`}
        >
          {isDone
            ? "Video uploaded"
            : isError
            ? "Upload failed"
            : `Uploading…`}
        </div>
        <div
          className={`text-xs font-mono truncate ${
            isDone ? "text-green-600" : isError ? "text-red-600" : "text-muted-foreground"
          }`}
        >
          {isError ? record.error : record.lessonTitle}
        </div>

        {/* Progress bar */}
        {!isDone && !isError && (
          <div className="mt-1.5 w-full bg-primary/10 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${record.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Progress % or dismiss */}
      {!isDone && !isError ? (
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary">
            {record.progress}%
          </span>
          <button
            onClick={() => cancelUpload(record.id)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
            title="Cancel upload"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => dismissUpload(record.id)}
          className="shrink-0 p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function GlobalUploadBanner() {
  const [uploads, setUploads] = useState<UploadRecord[]>(() => getUploads());

  // Subscribe to the module-level upload manager
  useEffect(() => {
    return subscribe(() => setUploads(getUploads()));
  }, []);

  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[200] w-80 space-y-2 pointer-events-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pointer-events-none">
        <CloudUpload className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
          Bunny Stream
        </span>
      </div>
      {uploads.map((record) => (
        <div key={record.id} className="pointer-events-auto">
          <UploadRow record={record} onQueryInvalidated={() => {}} />
        </div>
      ))}
    </div>
  );
}
