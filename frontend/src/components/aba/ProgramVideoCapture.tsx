'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  CheckCircle2,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  apiClient,
  ApiResponse,
  ProgramVideo,
  ProgramVideoSettings,
  ProgramVideoUploadTarget,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * Optional practice video for the program the parent is running: record it
 * in-app while practicing, or upload a file. While recording, a small floating
 * preview (minimisable to a pill) keeps "About this program", the guide and the
 * trial buttons fully usable underneath.
 *
 * One video per program per practice run — recording again replaces it until
 * the session is submitted; then it goes to AI analysis and clinical review.
 */

type Props = {
  sessionId: number;
  programId: string;
  activityId: string;
  programName: string;
  language: 'en' | 'id';
  /** True while recording or uploading — the runner holds submission until done. */
  onBusyChange?: (busy: boolean) => void;
};

type RecorderState = 'idle' | 'starting' | 'recording';

type UploadState = { programId: string; progress: number } | null;

/** In-app recordings are capped shorter than uploads: phone storage and battery. */
const MAX_RECORDING_SECONDS = 15 * 60;

const MIME_CANDIDATES = [
  // MP4 first: it plays everywhere, including Safari for the reviewing admin.
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function baseMime(mime: string): string {
  return String(mime || '').split(';')[0].trim().toLowerCase();
}

function extensionFor(mime: string): string {
  const base = baseMime(mime);
  if (base === 'video/mp4') return 'mp4';
  if (base === 'video/quicktime') return 'mov';
  if (base === 'video/3gpp') return '3gp';
  return 'webm';
}

function guessFileMime(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4';
  if (name.endsWith('.3gp')) return 'video/3gpp';
  return 'video/webm';
}

function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Duration of a picked file, read from its metadata (null if the browser can't tell). */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = window.setTimeout(() => done(null), 8000);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
    };
    el.onerror = () => {
      window.clearTimeout(timer);
      done(null);
    };
    el.src = url;
  });
}

export function ProgramVideoCapture({
  sessionId,
  programId,
  activityId,
  programName,
  language,
  onBusyChange,
}: Props) {
  const isId = language === 'id';
  const [settings, setSettings] = useState<ProgramVideoSettings | null>(null);
  const [videos, setVideos] = useState<Record<string, ProgramVideo>>({});
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<'record' | 'upload' | null>(null);
  const [recorder, setRecorder] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [minimized, setMinimized] = useState(false);
  const [upload, setUpload] = useState<UploadState>(null);
  const [error, setError] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** The program a recording belongs to — fixed when it starts. */
  const recordingTargetRef = useRef<{ programId: string; activityId: string } | null>(null);

  const busy = recorder !== 'idle' || upload !== null;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Consent + limits, and any videos already in this session (resume).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, list] = await Promise.all([
          apiClient.get<ApiResponse<ProgramVideoSettings>>('/program-videos/me'),
          apiClient.get<ApiResponse<{ videos: ProgramVideo[] }>>(`/program-videos/session/${sessionId}`),
        ]);
        if (cancelled) return;
        if (me.data.success && me.data.data) setSettings(me.data.data);
        if (list.data.success && list.data.data) {
          const map: Record<string, ProgramVideo> = {};
          for (const v of list.data.data.videos) map[v.program_id] = v;
          setVideos(map);
        }
      } catch {
        // Non-fatal: the practice itself works without video.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Leaving mid-recording or mid-upload loses the video — say so.
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [busy]);

  const releaseDevices = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // Never leave the camera on after the page goes away.
  useEffect(() => () => releaseDevices(), [releaseDevices]);

  // The floating preview mounts when recording starts; attach the live stream
  // once both exist (the camera can resolve before or after the first render).
  useEffect(() => {
    if (recorder !== 'idle' && previewRef.current && streamRef.current) {
      if (previewRef.current.srcObject !== streamRef.current) {
        previewRef.current.srcObject = streamRef.current;
      }
    }
  }, [recorder, minimized]);

  const uploadVideo = useCallback(
    async (
      blob: Blob,
      meta: {
        programId: string;
        activityId: string;
        source: 'recording' | 'upload';
        mimeType: string;
        durationSeconds: number | null;
        recordingStartedAt: number | null;
      },
    ) => {
      setError('');
      setUpload({ programId: meta.programId, progress: 0 });
      try {
        const init = await apiClient.post<
          ApiResponse<{ video: ProgramVideo; upload: ProgramVideoUploadTarget }>
        >('/program-videos', {
          session_id: sessionId,
          program_id: meta.programId,
          activity_id: meta.activityId || null,
          source: meta.source,
          mime_type: meta.mimeType,
          file_size: blob.size,
          duration_seconds: meta.durationSeconds,
          recording_started_at: meta.recordingStartedAt,
        });
        if (!init.data.success || !init.data.data) {
          throw new Error(init.data.error || 'Failed to start upload');
        }
        const { video, upload: target } = init.data.data;
        const onUploadProgress = (e: { loaded: number; total?: number }) => {
          const total = e.total || blob.size;
          setUpload({ programId: meta.programId, progress: Math.min(99, Math.round((e.loaded / total) * 100)) });
        };

        if (target.kind === 's3') {
          // Straight to the private bucket. Plain axios: S3 rejects our auth header.
          await axios.put(target.url, blob, { headers: target.headers, onUploadProgress });
        } else {
          const fd = new FormData();
          fd.append('file', blob, `practice.${extensionFor(meta.mimeType)}`);
          await apiClient.post(target.path, fd, { onUploadProgress });
        }

        const done = await apiClient.post<ApiResponse<{ video: ProgramVideo }>>(
          `/program-videos/${video.id}/complete`,
          {},
        );
        if (!done.data.success || !done.data.data) {
          throw new Error(done.data.error || 'Failed to save video');
        }
        setVideos((prev) => ({ ...prev, [meta.programId]: done.data.data!.video }));
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            (isId ? 'Video gagal diunggah. Coba lagi.' : 'The video failed to upload. Please try again.'),
        );
      } finally {
        setUpload(null);
      }
    },
    [sessionId, isId],
  );

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(
        isId
          ? 'Browser ini tidak mendukung perekaman. Gunakan "Unggah video" sebagai gantinya.'
          : 'This browser cannot record video. Use "Upload a video" instead.',
      );
      return;
    }
    const mimeType = pickRecorderMime();
    setRecorder('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (previewRef.current) previewRef.current.srcObject = stream;

      const rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        // ~1 Mbps: plenty for the AI (it samples ~1 frame/s) and kind to mobile data.
        videoBitsPerSecond: 1_000_000,
        audioBitsPerSecond: 64_000,
      });
      chunksRef.current = [];
      recordingTargetRef.current = { programId, activityId };
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const target = recordingTargetRef.current;
        const recordedMime = rec.mimeType || mimeType || 'video/webm';
        const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: baseMime(recordedMime) });
        chunksRef.current = [];
        releaseDevices();
        setRecorder('idle');
        setMinimized(false);
        if (target && blob.size > 0) {
          void uploadVideo(blob, {
            programId: target.programId,
            activityId: target.activityId,
            source: 'recording',
            mimeType: baseMime(recordedMime),
            durationSeconds,
            recordingStartedAt: startedAtRef.current,
          });
        }
      };
      mediaRecorderRef.current = rec;

      rec.start(1000);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecorder('recording');
      tickRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(secs);
        if (secs >= MAX_RECORDING_SECONDS) stopRecording();
      }, 500);

      // Keep the screen awake: a locked phone would cut the recording short.
      const wl = (navigator as any).wakeLock;
      if (wl?.request) {
        wakeLockRef.current = await wl.request('screen').catch(() => null);
      }
    } catch (e: any) {
      releaseDevices();
      setRecorder('idle');
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      setError(
        denied
          ? isId
            ? 'Izin kamera/mikrofon ditolak. Izinkan di pengaturan browser, atau gunakan "Unggah video".'
            : 'Camera/microphone permission was denied. Allow it in your browser settings, or use "Upload a video".'
          : isId
            ? 'Kamera tidak bisa dibuka. Coba lagi atau gunakan "Unggah video".'
            : 'Could not open the camera. Try again or use "Upload a video".',
      );
    }
  }, [activityId, facingMode, isId, programId, releaseDevices, stopRecording, uploadVideo]);

  // Moving to another task ends the recording; it belongs to the task it started on.
  useEffect(() => {
    if (recorder === 'recording' && recordingTargetRef.current?.activityId !== activityId) {
      stopRecording();
    }
  }, [activityId, recorder, stopRecording]);

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    const maxMb = settings?.max_file_mb ?? 500;
    if (!file.type.startsWith('video/') && !/\.(mp4|m4v|mov|webm|3gp)$/i.test(file.name)) {
      setError(isId ? 'Pilih file video (MP4, MOV, atau WebM).' : 'Choose a video file (MP4, MOV or WebM).');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(
        isId
          ? `Video terlalu besar (maks ${maxMb} MB). Rekam klip yang lebih pendek.`
          : `The video is too large (max ${maxMb} MB). Try a shorter clip.`,
      );
      return;
    }
    const durationSeconds = await readVideoDuration(file);
    const maxSeconds = settings?.max_duration_seconds ?? 1200;
    if (durationSeconds !== null && durationSeconds > maxSeconds) {
      setError(
        isId
          ? `Video terlalu panjang (maks ${Math.round(maxSeconds / 60)} menit).`
          : `The video is too long (max ${Math.round(maxSeconds / 60)} minutes).`,
      );
      return;
    }
    const mimeType = baseMime(guessFileMime(file));
    await uploadVideo(file, {
      programId,
      activityId,
      source: 'upload',
      mimeType,
      durationSeconds,
      recordingStartedAt: null,
    });
  };

  const runAction = (action: 'record' | 'upload') => {
    if (action === 'record') void startRecording();
    else fileInputRef.current?.click();
  };

  const requestAction = (action: 'record' | 'upload') => {
    if (!settings?.consented) {
      setPendingAction(action);
      setConsentOpen(true);
      return;
    }
    runAction(action);
  };

  const acceptConsent = async () => {
    try {
      setConsentBusy(true);
      const res = await apiClient.post<ApiResponse<{ consented: boolean; consented_at: string }>>(
        '/program-videos/consent',
        {},
      );
      if (!res.data.success) throw new Error(res.data.error || 'Failed');
      setSettings((s) =>
        s
          ? { ...s, consented: true, consented_at: res.data.data?.consented_at ?? null }
          : s,
      );
      setConsentOpen(false);
      const action = pendingAction;
      setPendingAction(null);
      if (action) runAction(action);
    } catch {
      setError(isId ? 'Persetujuan gagal disimpan. Coba lagi.' : 'Could not save your consent. Please try again.');
    } finally {
      setConsentBusy(false);
    }
  };

  const removeVideo = async (video: ProgramVideo) => {
    if (!window.confirm(isId ? 'Hapus video ini?' : 'Remove this video?')) return;
    try {
      await apiClient.delete(`/program-videos/${video.id}`);
      setVideos((prev) => {
        const next = { ...prev };
        delete next[video.program_id];
        return next;
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || (isId ? 'Video gagal dihapus.' : 'Could not remove the video.'));
    }
  };

  const current = videos[programId];
  const uploadingHere = upload?.programId === programId;
  const recordingHere = recorder !== 'idle' && recordingTargetRef.current?.programId === programId;

  return (
    <>
      <div className="rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#00C1B2]/10 p-2">
            <Video className="h-5 w-5 text-[#00A896]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[#1A2B4C]">
              {isId ? 'Video latihan (opsional)' : 'Practice video (optional)'}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-[#1A2B4C]/60">
              {isId
                ? `Rekam atau unggah latihan "${programName}". Tim klinis akan menilai dan memberi umpan balik di Catatan Aktivitas.`
                : `Record or upload your "${programName}" practice. The clinical team will review it and send feedback in Activity Logs.`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {uploadingHere ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-[#1A2B4C]/70">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {isId ? 'Mengunggah video…' : 'Uploading video…'}
              </span>
              <span>{upload?.progress ?? 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E5E8EB]">
              <div
                className="h-full rounded-full bg-[#00C1B2] transition-all"
                style={{ width: `${upload?.progress ?? 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#1A2B4C]/50">
              {isId ? 'Jangan tutup halaman ini sampai selesai.' : "Keep this page open until it's done."}
            </p>
          </div>
        ) : recordingHere ? (
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-600">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden />
            {isId ? `Sedang merekam ${clock(elapsed)}` : `Recording ${clock(elapsed)}`}
          </p>
        ) : current && current.status !== 'awaiting_upload' ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00736C]">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {isId ? 'Video tersimpan' : 'Video saved'}
              {current.duration_seconds ? ` · ${clock(current.duration_seconds)}` : ''}
            </span>
            {current.status === 'uploaded' && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => requestAction('record')} disabled={busy}>
                  {isId ? 'Rekam ulang' : 'Record again'}
                </Button>
                <button
                  type="button"
                  onClick={() => void removeVideo(current)}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#1A2B4C]/60 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {isId ? 'Hapus' : 'Remove'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="brand"
                className="min-h-[44px] gap-1.5"
                onClick={() => requestAction('record')}
                disabled={busy}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
                {isId ? 'Rekam sambil latihan' : 'Record while practicing'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] gap-1.5"
                onClick={() => requestAction('upload')}
                disabled={busy}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {isId ? 'Unggah video' : 'Upload a video'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#1A2B4C]/55">
              <span>
                {isId
                  ? 'Tips: berdirikan HP menghadap Anda dan anak — kamera depan merekam, layar tetap bisa dipakai mencatat trial.'
                  : 'Tip: stand the phone up facing you and your child — the front camera records while you keep using the screen.'}
              </span>
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-[#00736C] underline underline-offset-2"
              >
                <RefreshCcw className="h-3 w-3" aria-hidden />
                {facingMode === 'user'
                  ? isId
                    ? 'Kamera: depan'
                    : 'Camera: front'
                  : isId
                    ? 'Kamera: belakang'
                    : 'Camera: back'}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            void onFileChosen(f);
          }}
        />
      </div>

      {/* Floating preview — small and movable out of the way, so the program
          info and the trial buttons stay usable while recording. */}
      {recorder !== 'idle' && (
        <div
          className={cn(
            'fixed right-3 z-50 overflow-hidden border border-white/20 bg-[#1A2B4C] shadow-2xl',
            'bottom-[104px] sm:bottom-[96px]',
            minimized ? 'rounded-full' : 'w-40 rounded-2xl sm:w-56',
          )}
          role="region"
          aria-label={isId ? 'Perekaman video' : 'Video recording'}
        >
          <video
            ref={previewRef}
            muted
            playsInline
            autoPlay
            className={cn(
              'aspect-[3/4] w-full object-cover sm:aspect-video',
              minimized && 'hidden',
              facingMode === 'user' && '-scale-x-100',
            )}
          />
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tabular-nums text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
              {recorder === 'starting' ? '…' : clock(elapsed)}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              disabled={recorder !== 'recording'}
              className="ml-auto inline-flex h-9 items-center gap-1 rounded-full bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              aria-label={isId ? 'Hentikan rekaman' : 'Stop recording'}
            >
              <Square className="h-3 w-3 fill-current" aria-hidden />
              {isId ? 'Stop' : 'Stop'}
            </button>
            <button
              type="button"
              onClick={() => setMinimized((m) => !m)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              aria-label={minimized ? (isId ? 'Perbesar' : 'Expand') : isId ? 'Perkecil' : 'Minimize'}
            >
              {minimized ? <Maximize2 className="h-4 w-4" aria-hidden /> : <Minimize2 className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      )}

      {consentOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1A2B4C]/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                {isId ? 'Persetujuan video latihan' : 'Practice video consent'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setConsentOpen(false);
                  setPendingAction(null);
                }}
                className="rounded-lg p-1 text-[#1A2B4C]/50 hover:bg-[#E5E8EB]"
                aria-label={isId ? 'Tutup' : 'Close'}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-[#1A2B4C]/80">
              {isId ? (
                <>
                  <p>Video latihan bersifat opsional. Dengan merekam atau mengunggah video, Anda menyetujui bahwa:</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Video (yang dapat menampilkan Anda dan anak Anda) disimpan secara privat dan aman.</li>
                    <li>Video dianalisis oleh layanan AI pihak ketiga (Google Gemini) dan ditinjau oleh tim klinis Gradion untuk memberi umpan balik.</li>
                    <li>File video dihapus otomatis 14 hari setelah ditinjau (atau 30 hari jika belum ditinjau). Hasil penilaian dan umpan balik tetap tersimpan.</li>
                  </ul>
                  <p>Anda bisa berhenti menggunakan fitur ini kapan saja.</p>
                </>
              ) : (
                <>
                  <p>Practice videos are optional. By recording or uploading a video, you agree that:</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>The video (which may show you and your child) is stored privately and securely.</li>
                    <li>It is analyzed by a third-party AI service (Google Gemini) and reviewed by Gradion&apos;s clinical team to give you feedback.</li>
                    <li>Video files are deleted automatically 14 days after review (or 30 days if never reviewed). Scores and feedback are kept.</li>
                  </ul>
                  <p>You can stop using this feature at any time.</p>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setConsentOpen(false);
                  setPendingAction(null);
                }}
                disabled={consentBusy}
              >
                {isId ? 'Tidak sekarang' : 'Not now'}
              </Button>
              <Button variant="brand" onClick={() => void acceptConsent()} disabled={consentBusy}>
                {consentBusy ? '…' : isId ? 'Saya setuju' : 'I agree'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
