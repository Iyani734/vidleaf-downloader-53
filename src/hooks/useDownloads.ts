import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveDownload, DownloadStatus, HistoryItem, QualityOption, VideoInfo } from "@/lib/vidleaf/types";
import { AnalysisError, type BackendDownloadJob, type BackendJobStatus, vidleafService } from "@/lib/vidleaf/service";

const POLL_MS = 2000;

function mapStatus(status: BackendJobStatus): DownloadStatus {
  switch (status) {
    case "queued":
    case "analyzing":
      return "preparing";
    case "downloading_video":
    case "downloading_audio":
      return "downloading";
    case "merging":
    case "validating":
      return "processing";
    case "ready":
      return "ready";
    case "cancelled":
      return "cancelled";
    case "expired":
    case "failed":
    default:
      return "failed";
  }
}

function isLive(status: DownloadStatus): boolean {
  return status === "preparing" || status === "downloading" || status === "processing";
}

function mergeJob(item: ActiveDownload, job: BackendDownloadJob): ActiveDownload {
  const status = mapStatus(job.status);
  const total = job.totalBytes ?? job.estimatedSizeBytes ?? item.totalBytes;
  const downloaded =
    status === "ready"
      ? total || job.downloadedBytes || item.receivedBytes
      : job.downloadedBytes ?? item.receivedBytes;
  const downloadUrl = job.downloadUrl ? vidleafService.absoluteUrl(job.downloadUrl) : item.downloadUrl;

  return {
    ...item,
    title: job.title || item.title,
    thumbnail: job.thumbnail || item.thumbnail,
    totalBytes: total,
    receivedBytes: Math.min(downloaded, total || downloaded),
    speedBps: job.speedBytesPerSecond ?? 0,
    status,
    downloadUrl,
    downloadTokenExpiresAt: job.downloadTokenExpiresAt || item.downloadTokenExpiresAt,
    error:
      job.status === "failed"
        ? job.errorMessage || "This download failed."
        : job.status === "expired"
          ? "This download expired."
          : undefined,
  };
}

function historyFromDownload(item: ActiveDownload): HistoryItem {
  return {
    id: item.id,
    title: item.title,
    channel: item.channel,
    thumbnail: item.thumbnail,
    url: item.sourceUrl,
    qualityLabel: item.qualityLabel,
    resolution: item.resolution,
    format: item.format,
    kind: item.kind,
    sizeBytes: item.totalBytes,
    durationSeconds: item.durationSeconds,
    completedAt: Date.now(),
    downloadSeconds: Math.max(1, Math.round((Date.now() - item.startedAt) / 1000)),
    downloadUrl: item.downloadUrl,
  };
}

function messageFromError(error: unknown): string {
  if (error instanceof AnalysisError) return error.message;
  if (error instanceof Error) return error.message;
  return "VidLeaf could not update this download.";
}

function isTransientPollError(error: unknown): boolean {
  if (error instanceof AnalysisError) {
    return error.status === 429 || Boolean(error.status && error.status >= 500);
  }
  return true;
}

/**
 * Owns real backend download jobs plus local completed-download history.
 */
export function useDownloads() {
  const [active, setActive] = useState<ActiveDownload[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const activeRef = useRef<ActiveDownload[]>([]);
  const recordedReady = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    setHistory(vidleafService.loadHistory());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) vidleafService.saveHistory(history);
  }, [history, hydrated]);

  const applyJob = useCallback((job: BackendDownloadJob) => {
    setActive((prev) => prev.map((item) => (item.id === job.jobId ? mergeJob(item, job) : item)));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const live = activeRef.current.filter((item) => isLive(item.status));
      for (const item of live) {
        void vidleafService
          .getDownloadJob(item.id)
          .then(applyJob)
          .catch((error) => {
            if (isTransientPollError(error)) {
              setActive((prev) =>
                prev.map((download) =>
                  download.id === item.id && isLive(download.status)
                    ? { ...download, speedBps: 0 }
                    : download,
                ),
              );
              return;
            }
            const message = messageFromError(error);
            setActive((prev) =>
              prev.map((download) =>
                download.id === item.id
                  ? { ...download, status: "failed", speedBps: 0, error: message }
                  : download,
              ),
            );
          });
      }
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [applyJob]);

  useEffect(() => {
    const newlyReady = active.filter((item) => item.status === "ready" && !recordedReady.current.has(item.id));
    if (newlyReady.length === 0) return;

    for (const item of newlyReady) {
      recordedReady.current.add(item.id);
    }
    setHistory((items) => [...newlyReady.map(historyFromDownload), ...items]);
  }, [active]);

  const startDownload = useCallback(
    async (video: VideoInfo, quality: QualityOption, _speedMbps: number) => {
      const job = await vidleafService.createDownloadJob(video, quality);
      const entry: ActiveDownload = {
        id: job.jobId,
        videoId: video.id,
        sourceUrl: video.url,
        title: video.title,
        channel: video.channel,
        thumbnail: video.thumbnail,
        durationSeconds: video.durationSeconds,
        qualityLabel: quality.label,
        resolution: quality.resolution,
        format: quality.format,
        kind: quality.kind,
        totalBytes: job.estimatedSizeBytes ?? quality.sizeBytes,
        receivedBytes: 0,
        speedBps: 0,
        status: mapStatus(job.status),
        startedAt: Date.now(),
        canPause: false,
      };
      setActive((prev) => [entry, ...prev]);
      void vidleafService.getDownloadJob(job.jobId).then(applyJob).catch(() => undefined);
      return entry;
    },
    [applyJob],
  );

  const togglePause = useCallback((id: string) => {
    setActive((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, error: "Pause is not supported for real backend downloads yet." }
          : item,
      ),
    );
  }, []);

  const cancelDownload = useCallback(
    async (id: string) => {
      try {
        const job = await vidleafService.cancelDownload(id);
        applyJob(job);
      } catch (error) {
        const message = messageFromError(error);
        setActive((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: "failed", error: message } : item)),
        );
      }
    },
    [applyJob],
  );

  const failDownload = useCallback((id: string, message: string) => {
    setActive((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "failed", speedBps: 0, error: message } : item)),
    );
  }, []);

  const retryDownload = useCallback(
    async (id: string) => {
      const previous = activeRef.current.find((item) => item.id === id);
      if (!previous) return;
      try {
        const job = await vidleafService.retryDownload(id);
        const retried: ActiveDownload = {
          ...previous,
          id: job.jobId,
          receivedBytes: 0,
          speedBps: 0,
          status: mapStatus(job.status),
          startedAt: Date.now(),
          error: undefined,
          downloadUrl: undefined,
          downloadTokenExpiresAt: undefined,
        };
        setActive((prev) => [retried, ...prev.filter((item) => item.id !== id)]);
        void vidleafService.getDownloadJob(job.jobId).then(applyJob).catch(() => undefined);
      } catch (error) {
        failDownload(id, messageFromError(error));
      }
    },
    [applyJob, failDownload],
  );

  const dismissDownload = useCallback((id: string) => {
    setActive((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const activeCount = active.filter((item) => isLive(item.status)).length;

  return {
    active,
    history,
    hydrated,
    activeCount,
    startDownload,
    togglePause,
    cancelDownload,
    failDownload,
    retryDownload,
    dismissDownload,
    removeHistoryItem,
    clearHistory,
  };
}
