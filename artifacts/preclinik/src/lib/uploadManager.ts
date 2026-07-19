/**
 * Module-level upload manager — lives outside the React tree.
 *
 * Because it's a plain JS module (not React state), active XHR transfers
 * survive component unmounts and SPA navigations. The GlobalUploadBanner
 * subscribes to this module and re-renders whenever something changes.
 *
 * Usage:
 *   const uploadId = startUpload({ lessonId, moduleId, lessonTitle, file, token });
 *   // XHR is now running. You can close the drawer. The banner shows progress.
 */

export interface UploadRecord {
  id: string;
  lessonId: string;
  moduleId: string;
  lessonTitle: string;
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
  error?: string;
}

// ── Module-level state ────────────────────────────────────────────────────────

const _uploads = new Map<string, UploadRecord>();
const _xhrs = new Map<string, XMLHttpRequest>();
let _listeners: (() => void)[] = [];

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _set(record: UploadRecord) {
  _uploads.set(record.id, record);
  _notify();
}

function _patch(id: string, patch: Partial<UploadRecord>) {
  const existing = _uploads.get(id);
  if (existing) {
    _uploads.set(id, { ...existing, ...patch });
    _notify();
  }
}

function _remove(id: string) {
  _uploads.delete(id);
  _xhrs.delete(id);
  _notify();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Subscribe to upload state changes.
 * Returns an unsubscribe function suitable for useEffect cleanup.
 */
export function subscribe(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

/** Snapshot of all active uploads (for rendering). */
export function getUploads(): UploadRecord[] {
  return Array.from(_uploads.values());
}

/**
 * Start a background upload to Bunny Stream via the API server.
 * Returns the uploadId. The XHR runs independently of any React component.
 * The GlobalUploadBanner will automatically invalidate the lesson list query
 * when the upload completes.
 */
export function startUpload({
  lessonId,
  moduleId,
  lessonTitle,
  file,
  token,
}: {
  lessonId: string;
  moduleId: string;
  lessonTitle: string;
  file: File;
  token: string | null;
}): string {
  const uploadId = `bunny-${lessonId}-${Date.now()}`;

  _set({
    id: uploadId,
    lessonId,
    moduleId,
    lessonTitle,
    fileName: file.name,
    progress: 0,
    status: "uploading",
  });

  const xhr = new XMLHttpRequest();
  _xhrs.set(uploadId, xhr);

  xhr.upload.addEventListener("progress", (e) => {
    if (e.lengthComputable) {
      _patch(uploadId, {
        progress: Math.round((e.loaded / e.total) * 95), // cap at 95% until server confirms
      });
    }
  });

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      _patch(uploadId, { status: "done", progress: 100 });
      // Auto-remove after 5 s so the banner fades away
      setTimeout(() => _remove(uploadId), 5000);
    } else {
      let msg = `Upload failed (${xhr.status})`;
      try {
        msg = JSON.parse(xhr.responseText)?.error || msg;
      } catch {}
      _patch(uploadId, { status: "error", error: msg });
    }
  };

  xhr.onerror = () => {
    _patch(uploadId, { status: "error", error: "Network error — check your connection" });
  };

  xhr.open("POST", `/api/admin/lessons/${lessonId}/upload-video`);
  if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

  const formData = new FormData();
  formData.append("video", file);
  xhr.send(formData);

  return uploadId;
}

/** Cancel an in-progress upload. */
export function cancelUpload(uploadId: string): void {
  _xhrs.get(uploadId)?.abort();
  _remove(uploadId);
}

/** Dismiss a done/error record manually. */
export function dismissUpload(uploadId: string): void {
  _remove(uploadId);
}
