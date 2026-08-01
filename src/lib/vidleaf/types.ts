// Shared domain types for VidLeaf.
// These mirror the shape a real backend API would return, so swapping the
// mock service (see ./service.ts) for real endpoints requires no UI changes.

export type MediaKind = "video" | "audio";

export type FileFormat = "MP4" | "WebM" | "MP3" | "M4A";

export interface QualityOption {
  id: string;
  label: string; // "Full HD / 1080p"
  resolution: string; // "1920x1080" | "Audio"
  height: number; // 2160, 1080 ... 0 for audio
  kind: MediaKind;
  format: FileFormat;
  fps?: number | undefined;
  sizeMB: number;
  available: boolean;
  recommended?: boolean | undefined;
  bitrateKbps?: number | undefined;
}

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
  channel: string;
  channelAvatar?: string | undefined;
  thumbnail: string;
  durationSeconds: number;
  uploadedAt: string; // ISO date
  views?: number | undefined;
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
  title: string;
  channel: string;
  thumbnail: string;
  durationSeconds: number;
  qualityLabel: string;
  resolution: string;
  format: FileFormat;
  kind: MediaKind;
  totalMB: number;
  downloadedMB: number;
  speedMbps: number;
  status: DownloadStatus;
  startedAt: number;
  error?: string | undefined;
}

export interface HistoryItem {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  qualityLabel: string;
  resolution: string;
  height: number;
  format: FileFormat;
  kind: MediaKind;
  sizeMB: number;
  durationSeconds: number;
  completedAt: string; // ISO
  downloadSeconds: number;
}

export type SpeedPresetId = "slow" | "average" | "fast" | "veryfast" | "custom";

export interface SpeedPreset {
  id: SpeedPresetId;
  label: string;
  mbps: number;
}
