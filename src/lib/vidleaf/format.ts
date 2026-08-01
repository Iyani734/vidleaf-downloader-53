// Pure browser-side helpers: formatting + download-time estimation.

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export function formatViews(views?: number): string | null {
  if (views == null) return null;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(iso);
}

/**
 * estimated time = file size in bits / speed in bits per second, +10% overhead.
 */
export function estimateSeconds(sizeMB: number, speedMbps: number): number {
  if (speedMbps <= 0) return 0;
  const bits = sizeMB * 8 * 1024 * 1024;
  const bps = speedMbps * 1_000_000;
  return (bits / bps) * 1.1;
}

export function friendlyEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Less than 1 minute";
  if (seconds < 60) return "Less than 1 minute";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `About ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `About ${hours} hour${hours === 1 ? "" : "s"}`;
}

export function preciseEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, "0")}s left`;
}

export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

export function validateVideoUrl(raw: string): { valid: boolean; message?: string } {
  const value = raw.trim();
  if (!value) return { valid: false, message: "Paste a video link to continue." };
  if (!/^https?:\/\//i.test(value))
    return { valid: false, message: "Links must start with http:// or https://" };
  if (!URL_RE.test(value))
    return { valid: false, message: "That doesn't look like a valid video link." };
  return { valid: true };
}
