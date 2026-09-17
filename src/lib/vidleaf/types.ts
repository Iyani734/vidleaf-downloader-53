// Shared domain types for VidLeaf's frontend.
// These mirror the shapes a real analysis/download API would return.

export type MediaKind = "video" | "audio";
export type FileFormat = "MP4" | "WebM" | "MP3" | "M4A";

export interface QualityOption {
  id: string;
  label: string; // "Full HD / 1080p"
  resolution: string; // "1920x1080" or "—"
  height: number; // 1080, 0 for audio
  format: FileFormat;
  sizeBytes: number;
  fps?: number;
  kind: MediaKind;
  available: boolean;
  recommended?: boolean;
}

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationSeconds: number;
  uploadedAt: string; // ISO
  views?: number;
  qualities: QualityOption[];
}

export type DownloadStatus =
  | "preparing"
  | "downloading"
  | "paused"
  | "processing"
  | "ready"
  | "failed"
  | "cancelled";

export interface ActiveDownload {
  id: string;
  videoId: string;
  sourceUrl: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationSeconds: number;
  qualityLabel: string;
  resolution: string;
  format: FileFormat;
  kind: MediaKind;
  totalBytes: number;
  receivedBytes: number;
  speedBps: number;
  status: DownloadStatus;
  startedAt: number;
  downloadUrl?: string;
  downloadTokenExpiresAt?: string;
  error?: string;
  canPause?: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  qualityLabel: string;
  resolution: string;
  format: FileFormat;
  kind: MediaKind;
  sizeBytes: number;
  durationSeconds: number;
  completedAt: number; // epoch ms
  downloadSeconds: number;
  downloadUrl?: string;
}
