import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadHistory, saveHistory } from "./service";
import type {
  ActiveDownload,
  HistoryItem,
  QualityOption,
  VideoInfo,
} from "./types";

interface DownloadContextValue {
  active: ActiveDownload[];
  history: HistoryItem[];
  hydrated: boolean;
  startDownload: (video: VideoInfo, quality: QualityOption, speedMbps: number) => string;
  togglePause: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  dismissDownload: (id: string) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
}

const DownloadContext = createContext<DownloadContextValue | null>(null);

const TICK_MS = 600;

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDownload[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const speedRef = useRef(20);

  // Local storage hydration (client-only, avoids SSR mismatch).
  useEffect(() => {
    setHistory(loadHistory());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveHistory(history);
  }, [history, hydrated]);

  const completeToHistory = useCallback((d: ActiveDownload) => {
    const item: HistoryItem = {
      id: d.id,
      title: d.title,
      channel: d.channel,
      thumbnail: d.thumbnail,
      url: `https://www.youtube.com/watch?v=${d.videoId}`,
      qualityLabel: d.qualityLabel,
      resolution: d.resolution,
      height: d.kind === "audio" ? 0 : Number.parseInt(d.resolution.split("x")[1] ?? "0", 10),
      format: d.format,
      kind: d.kind,
      sizeMB: d.totalMB,
      durationSeconds: d.durationSeconds,
      completedAt: new Date().toISOString(),
      downloadSeconds: Math.max(1, Math.round((Date.now() - d.startedAt) / 1000)),
    };
    setHistory((prev) => [item, ...prev.filter((h) => h.id !== item.id)]);
  }, []);

  // Simulated progress engine. Replace with SSE/polling on /api/downloads/:id.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((prev) => {
        if (prev.length === 0) return prev;
        const finished: ActiveDownload[] = [];
        const next = prev.map((d) => {
          if (d.status === "paused" || d.status === "ready" || d.status === "failed" || d.status === "cancelled")
            return d;

          const elapsed = (Date.now() - d.startedAt) / 1000;
          if (d.status === "preparing") {
            return elapsed > 1.8 ? { ...d, status: "downloading" as const } : d;
          }
          if (d.status === "processing") {
            const done = { ...d, status: "ready" as const, downloadedMB: d.totalMB };
            finished.push(done);
            return done;
          }
          // downloading
          const jitter = 0.75 + Math.random() * 0.5;
          const speed = Math.max(0.5, d.speedMbps * jitter);
          const mbPerTick = ((speed * 1_000_000) / 8 / 1024 / 1024) * (TICK_MS / 1000);
          const downloadedMB = Math.min(d.totalMB, d.downloadedMB + mbPerTick);
          if (Math.random() < 0.004) {
            return {
              ...d,
              status: "failed" as const,
              error: "Connection lost while transferring the file.",
            };
          }
          if (downloadedMB >= d.totalMB) {
            return { ...d, downloadedMB: d.totalMB, status: "processing" as const, speedMbps: speed };
          }
          return { ...d, downloadedMB, speedMbps: speed };
        });
        finished.forEach(completeToHistory);
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [completeToHistory]);

  const startDownload = useCallback(
    (video: VideoInfo, quality: QualityOption, speedMbps: number) => {
      speedRef.current = speedMbps;
      const id = `dl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const entry: ActiveDownload = {
        id,
        videoId: video.id,
        title: video.title,
        channel: video.channel,
        thumbnail: video.thumbnail,
        durationSeconds: video.durationSeconds,
        qualityLabel: quality.label,
        resolution: quality.resolution,
        format: quality.format,
        kind: quality.kind,
        totalMB: quality.sizeMB,
        downloadedMB: 0,
        speedMbps,
        status: "preparing",
        startedAt: Date.now(),
      };
      setActive((prev) => [entry, ...prev]);
      return id;
    },
    [],
  );

  const togglePause = useCallback((id: string) => {
    setActive((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status:
                d.status === "paused"
                  ? ("downloading" as const)
                  : d.status === "downloading" || d.status === "preparing"
                    ? ("paused" as const)
                    : d.status,
            }
          : d,
      ),
    );
  }, []);

  const cancelDownload = useCallback((id: string) => {
    setActive((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "cancelled" as const } : d)),
    );
  }, []);

  const retryDownload = useCallback((id: string) => {
    setActive((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "preparing" as const,
              downloadedMB: 0,
              startedAt: Date.now(),
              error: undefined,
            }
          : d,
      ),
    );
  }, []);

  const dismissDownload = useCallback((id: string) => {
    setActive((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo<DownloadContextValue>(
    () => ({
      active,
      history,
      hydrated,
      startDownload,
      togglePause,
      cancelDownload,
      retryDownload,
      dismissDownload,
      removeHistoryItem,
      clearHistory,
    }),
    [
      active,
      history,
      hydrated,
      startDownload,
      togglePause,
      cancelDownload,
      retryDownload,
      dismissDownload,
      removeHistoryItem,
      clearHistory,
    ],
  );

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>;
}

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error("useDownloads must be used inside <DownloadProvider>");
  return ctx;
}
