import type { FileFormat, HistoryItem, QualityOption, VideoInfo } from "./types";

type BackendFormat = {
  id: string;
  quality: string;
  label: string;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  container: "mp4" | "webm" | "m4a" | "mp3";
  hasVideo: boolean;
  hasAudio: boolean;
  estimatedSizeBytes?: number | null;
  recommended?: boolean;
};

type BackendAnalysis = {
  videoId: string;
  title: string;
  channel?: string | null;
  thumbnail?: string | null;
  durationSeconds?: number | null;
  uploadDate?: string | null;
  views?: number | null;
  formats: BackendFormat[];
};

export type BackendJobStatus =
  | "queued"
  | "analyzing"
  | "downloading_video"
  | "downloading_audio"
  | "merging"
  | "validating"
  | "ready"
  | "failed"
  | "cancelled"
  | "expired";

export type BackendDownloadJob = {
  jobId: string;
  status: BackendJobStatus;
  quality: string;
  container: string;
  estimatedSizeBytes?: number | null;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  progress?: number;
  downloadedBytes?: number;
  totalBytes?: number | null;
  speedBytesPerSecond?: number | null;
  etaSeconds?: number | null;
  message?: string | null;
  title?: string | null;
  thumbnail?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  downloadUrl?: string | null;
  downloadTokenExpiresAt?: string | null;
};

type BackendError = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

/**
 * Real VidLeaf API client.
 *
 * In local development, Vite proxies /api to the FastAPI backend on port 8000.
 * In production, set VITE_VIDLEAF_API_URL to the backend origin.
 */
export interface VidLeafService {
  analyzeVideo(url: string): Promise<VideoInfo>;
  createDownloadJob(video: VideoInfo, quality: QualityOption): Promise<BackendDownloadJob>;
  getDownloadJob(jobId: string): Promise<BackendDownloadJob>;
  cancelDownload(jobId: string): Promise<BackendDownloadJob>;
  retryDownload(jobId: string): Promise<BackendDownloadJob>;
  absoluteUrl(url: string): string;
  loadHistory(): HistoryItem[];
  saveHistory(items: HistoryItem[]): void;
}

const API_PREFIX = "/api/v1";
const API_BASE = (import.meta.env.VITE_VIDLEAF_API_URL ?? "").replace(/\/+$/, "");
const HISTORY_KEY = "vidleaf.history.v2";

export class AnalysisError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    options: { code?: string; status?: number; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "AnalysisError";
    if (options.code) this.code = options.code;
    if (options.status) this.status = options.status;
    if (options.details) this.details = options.details;
  }
}

const apiUrl = (path: string) => `${API_BASE}${API_PREFIX}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let payload: BackendError = {};
    try {
      payload = (await response.json()) as BackendError;
    } catch {
      // Keep the network error readable when a proxy/backend returns plain text.
    }
    const error = payload.error;
    throw new AnalysisError(
      error?.message || "VidLeaf could not complete that request. Make sure the backend is running.",
      {
        code: error?.code,
        status: response.status,
        details: error?.details,
      },
    );
  }

  return (await response.json()) as T;
}

function parseUploadDate(uploadDate?: string | null): string {
  if (!uploadDate) return new Date().toISOString();
  if (/^\d{8}$/.test(uploadDate)) {
    const year = uploadDate.slice(0, 4);
    const month = uploadDate.slice(4, 6);
    const day = uploadDate.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
  }
  const parsed = new Date(uploadDate);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function toFileFormat(container: BackendFormat["container"] | string): FileFormat {
  switch (container) {
    case "mp4":
      return "MP4";
    case "webm":
      return "WebM";
    case "mp3":
      return "MP3";
    case "m4a":
    default:
      return "M4A";
  }
}

function mapFormat(format: BackendFormat): QualityOption {
  const hasVideo = Boolean(format.hasVideo);
  const width = format.width ?? 0;
  const height = format.height ?? 0;

  return {
    id: format.id,
    label: format.label,
    resolution: hasVideo && width > 0 && height > 0 ? `${width}x${height}` : "Audio",
    height: hasVideo ? height : 0,
    format: toFileFormat(format.container),
    sizeBytes: format.estimatedSizeBytes ?? 0,
    fps: format.fps ?? undefined,
    kind: hasVideo ? "video" : "audio",
    available: true,
    recommended: Boolean(format.recommended),
  };
}

const TARGET_VIDEO_QUALITIES: Array<{ height: number; label: string; resolution: string }> = [
  { height: 2160, label: "4K / 2160p", resolution: "3840x2160" },
  { height: 1440, label: "2K / 1440p", resolution: "2560x1440" },
  { height: 1080, label: "Full HD / 1080p", resolution: "1920x1080" },
  { height: 720, label: "HD / 720p", resolution: "1280x720" },
  { height: 480, label: "480p", resolution: "854x480" },
  { height: 360, label: "360p", resolution: "640x360" },
];

function withUnavailableTargetQualities(qualities: QualityOption[]): QualityOption[] {
  const actualHeights = new Set(
    qualities.filter((quality) => quality.kind === "video" && quality.available).map((quality) => quality.height),
  );
  const placeholders: QualityOption[] = TARGET_VIDEO_QUALITIES.filter(
    (target) => !actualHeights.has(target.height),
  ).map((target) => ({
    id: `unavailable-${target.height}p`,
    label: target.label,
    resolution: target.resolution,
    height: target.height,
    format: "MP4",
    sizeBytes: 0,
    kind: "video",
    available: false,
  }));

  return [...qualities, ...placeholders].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "video" ? -1 : 1;
    if (a.height !== b.height) return b.height - a.height;
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.format.localeCompare(b.format);
  });
}

function qualityPayload(video: VideoInfo, quality: QualityOption) {
  if (quality.kind === "audio") {
    return {
      url: video.url,
      quality: "audio",
      audioFormat: quality.format === "MP3" ? "mp3" : "m4a",
      audioBitrateKbps: 192,
      allowQualityFallback: false,
    };
  }

  const [rawQuality, rawContainer] = quality.id.split("-");
  return {
    url: video.url,
    quality: rawQuality === "best" ? "best" : `${quality.height}p`,
    container: rawContainer === "webm" ? "webm" : "mp4",
    allowQualityFallback: false,
  };
}

export const vidleafService: VidLeafService = {
  async analyzeVideo(url: string): Promise<VideoInfo> {
    const data = await request<BackendAnalysis>("/videos/analyze", {
      method: "POST",
      body: JSON.stringify({ url }),
    });

    return {
      id: data.videoId,
      url,
      title: data.title,
      channel: data.channel || "Unknown channel",
      thumbnail: data.thumbnail || "",
      durationSeconds: data.durationSeconds ?? 0,
      uploadedAt: parseUploadDate(data.uploadDate),
      views: data.views ?? undefined,
      qualities: withUnavailableTargetQualities(data.formats.map(mapFormat)),
    };
  },

  createDownloadJob(video: VideoInfo, quality: QualityOption) {
    return request<BackendDownloadJob>("/downloads", {
      method: "POST",
      body: JSON.stringify(qualityPayload(video, quality)),
    });
  },

  getDownloadJob(jobId: string) {
    return request<BackendDownloadJob>(`/downloads/${encodeURIComponent(jobId)}`);
  },

  cancelDownload(jobId: string) {
    return request<BackendDownloadJob>(`/downloads/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    });
  },

  retryDownload(jobId: string) {
    return request<BackendDownloadJob>(`/downloads/${encodeURIComponent(jobId)}/retry`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  absoluteUrl(url: string) {
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE}${url}`;
  },

  loadHistory(): HistoryItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
    } catch {
      return [];
    }
  },

  saveHistory(items: HistoryItem[]) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      // History is helpful, not critical.
    }
  },
};

export const HISTORY_STORAGE_KEY = HISTORY_KEY;
