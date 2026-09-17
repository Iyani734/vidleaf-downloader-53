/** Presentation formatting helpers (pure, browser-safe). */

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i < 2 ? 0 : decimals)} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return "0 MB/s";
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatViews(views?: number): string | null {
  if (views === undefined) return null;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

export function formatDate(iso: string | number): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(epoch: number): string {
  const d = new Date(epoch);
  return `${formatDate(epoch)} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function relativeTime(epoch: number): string {
  const diff = Date.now() - epoch;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} d ago` : formatDate(epoch);
}

/**
 * estimated time = file size in bits / speed in bits per second, + ~10% overhead.
 */
export function estimateSeconds(sizeBytes: number, speedMbps: number): number {
  if (speedMbps <= 0) return 0;
  const bits = sizeBytes * 8;
  return (bits / (speedMbps * 1_000_000)) * 1.1;
}

export function friendlyEta(seconds: number): string {
  if (seconds <= 0) return "Less than 1 minute";
  if (seconds < 60) return "Less than 1 minute";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `About ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `About ${hours} hour${hours === 1 ? "" : "s"}`;
}

export function preciseEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s left`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s left`;
}

export function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return parsed.hostname.includes(".") && parsed.hostname.length > 3;
  } catch {
    return false;
  }
}
