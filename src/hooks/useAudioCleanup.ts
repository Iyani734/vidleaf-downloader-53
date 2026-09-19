import { useCallback, useEffect, useRef, useState } from "react";
import { AnalysisError, vidleafService, type BackendDownloadJob } from "@/lib/vidleaf/service";
import { audioService, type AudioOutputFormat, type EnhancementCatalog } from "@/lib/vidleaf/audioService";

const POLL_MS = 2000;
const HISTORY_KEY = "vidleaf.audio.history.v1";

export interface CleanedAudioItem {
  id: string;
  filename: string;
  outputFormat: string;
  enhancements: string[];
  sizeBytes: number;
  completedAt: number;
  downloadUrl?: string | undefined;
}

export interface AudioCleanupJob {
  id: string;
  filename: string;
  outputFormat: string;
  enhancements: string[];
  status: BackendDownloadJob["status"];
  progress: number;
  message: string;
  startedAt: number;
  downloadUrl?: string | undefined;
  sizeBytes?: number | undefined;
  error?: string | undefined;
}

const TERMINAL: BackendDownloadJob["status"][] = ["ready", "failed", "cancelled", "expired"];

function loadHistory(): CleanedAudioItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CleanedAudioItem[]) : [];
  } catch {
    return [];
  }
}

function messageFor(job: BackendDownloadJob): string {
  if (job.message) return job.message;
  return job.status === "ready" ? "Cleaned audio ready." : "Working on it…";
}

export function useAudioCleanup() {
  const [catalog, setCatalog] = useState<EnhancementCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<AudioCleanupJob[]>([]);
  const [history, setHistory] = useState<CleanedAudioItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const jobsRef = useRef<AudioCleanupJob[]>([]);
  const recorded = useRef<Set<string>>(new Set());

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    setHistory(loadHistory());
    setHydrated(true);
    audioService
      .loadCatalog()
      .then(setCatalog)
      .catch((error: unknown) =>
        setCatalogError(
          error instanceof AnalysisError || error instanceof Error
            ? error.message
            : "Cleanup options could not be loaded.",
        ),
      );
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // History is helpful, not critical.
    }
  }, [history, hydrated]);

  const applyJob = useCallback((job: BackendDownloadJob) => {
    setJobs((prev) =>
      prev.map((item) =>
        item.id === job.jobId
          ? {
              ...item,
              status: job.status,
              progress: job.progress ?? item.progress,
              message: messageFor(job),
              sizeBytes: job.finalSizeBytes ?? item.sizeBytes,
              downloadUrl: job.downloadUrl ? vidleafService.absoluteUrl(job.downloadUrl) : item.downloadUrl,
              ...(job.status === "failed" || job.status === "expired"
                ? { error: job.errorMessage || "This cleanup failed." }
                : {}),
            }
          : item,
      ),
    );
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      for (const job of jobsRef.current.filter((item) => !TERMINAL.includes(item.status))) {
        void vidleafService.getDownloadJob(job.id).then(applyJob).catch(() => undefined);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [applyJob]);

  useEffect(() => {
    const ready = jobs.filter((job) => job.status === "ready" && !recorded.current.has(job.id));
    if (ready.length === 0) return;
    for (const job of ready) recorded.current.add(job.id);
    setHistory((prev) => [
      ...ready.map((job) => ({
        id: job.id,
        filename: job.filename,
        outputFormat: job.outputFormat,
        enhancements: job.enhancements,
        sizeBytes: job.sizeBytes ?? 0,
        completedAt: Date.now(),
        downloadUrl: job.downloadUrl,
      })),
      ...prev,
    ]);
  }, [jobs]);

  const startCleanup = useCallback(
    async (input: { file: File; enhancements: string[]; outputFormat: AudioOutputFormat; bitrateKbps?: number }) => {
      const job = await audioService.createCleanupJob(input);
      setJobs((prev) => [
        {
          id: job.jobId,
          filename: job.sourceFilename || input.file.name,
          outputFormat: input.outputFormat,
          enhancements: input.enhancements,
          status: job.status,
          progress: job.progress ?? 0,
          message: messageFor(job),
          startedAt: Date.now(),
        },
        ...prev,
      ]);
      return job;
    },
    [],
  );

  const cancelCleanup = useCallback(
    async (id: string) => {
      try {
        applyJob(await vidleafService.cancelDownload(id));
      } catch {
        setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, status: "cancelled" } : job)));
      }
    },
    [applyJob],
  );

  const dismissJob = useCallback((id: string) => setJobs((prev) => prev.filter((job) => job.id !== id)), []);
  const removeHistoryItem = useCallback(
    (id: string) => setHistory((prev) => prev.filter((item) => item.id !== id)),
    [],
  );
  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    catalog,
    catalogError,
    jobs,
    history,
    activeCount: jobs.filter((job) => !TERMINAL.includes(job.status)).length,
    startCleanup,
    cancelCleanup,
    dismissJob,
    removeHistoryItem,
    clearHistory,
  };
}
