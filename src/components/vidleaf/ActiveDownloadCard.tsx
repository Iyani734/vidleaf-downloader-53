import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatSize,
  preciseEta,
} from "@/lib/vidleaf/format";
import type { ActiveDownload, DownloadStatus } from "@/lib/vidleaf/types";

const STATUS_META: Record<DownloadStatus, { label: string; className: string }> = {
  preparing: { label: "Preparing", className: "bg-secondary text-primary-dark" },
  downloading: { label: "Downloading", className: "bg-primary text-primary-foreground" },
  paused: { label: "Paused", className: "bg-secondary text-muted-foreground" },
  processing: { label: "Processing", className: "bg-accent text-accent-foreground" },
  ready: { label: "Ready", className: "bg-primary-dark text-primary-foreground" },
  failed: { label: "Failed", className: "bg-destructive text-destructive-foreground" },
  cancelled: { label: "Cancelled", className: "bg-secondary text-muted-foreground" },
};

interface Props {
  download: ActiveDownload;
  onTogglePause: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ActiveDownloadCard({
  download: d,
  onTogglePause,
  onCancel,
  onRetry,
  onDismiss,
}: Props) {
  const pct = d.totalMB > 0 ? Math.min(100, (d.downloadedMB / d.totalMB) * 100) : 0;
  const remainingMB = Math.max(0, d.totalMB - d.downloadedMB);
  const eta =
    d.status === "downloading"
      ? preciseEta((remainingMB * 8 * 1024 * 1024) / (d.speedMbps * 1_000_000))
      : d.status === "paused"
        ? "Paused"
        : d.status === "ready"
          ? "Completed"
          : "—";
  const meta = STATUS_META[d.status];
  const isActive = d.status === "downloading" || d.status === "preparing";

  return (
    <li className="surface-card overflow-hidden p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-secondary sm:w-44">
          <img
            src={d.thumbnail}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="size-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <h3 className="line-clamp-2 text-sm font-bold text-foreground sm:text-base">
              {d.title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${meta.className}`}
            >
              {meta.label}
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {d.qualityLabel} · {d.format} · {d.resolution}
          </p>

          <div className="mt-3">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
              aria-label={`Download progress for ${d.title}`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-linear ${
                  d.status === "failed"
                    ? "bg-destructive"
                    : d.status === "ready"
                      ? "bg-primary-dark"
                      : "bg-primary"
                } ${isActive ? "stripes-animate" : ""}`}
                style={{ width: `${d.status === "ready" ? 100 : pct}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <span className="font-semibold text-foreground">
                {Math.round(pct)}% · {formatSize(d.downloadedMB)} of {formatSize(d.totalMB)}
              </span>
              <span>
                {d.status === "downloading" ? `${d.speedMbps.toFixed(1)} Mbps · ` : ""}
                {eta}
              </span>
            </div>
          </div>

          {d.status === "failed" && (
            <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {d.error ?? "Download failed."}
            </p>
          )}
          {d.status === "processing" && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Settings2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
              Merging audio and video…
            </p>
          )}
          {d.status === "preparing" && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
              Preparing your file…
            </p>
          )}
          {d.status === "ready" && (
            <p className="mt-2 flex items-center gap-2 text-sm text-primary-dark">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Saved to your download history.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {(d.status === "downloading" || d.status === "paused" || d.status === "preparing") && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 rounded-xl sm:flex-none"
                onClick={() => onTogglePause(d.id)}
              >
                {d.status === "paused" ? (
                  <>
                    <Play className="size-4" aria-hidden="true" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-4" aria-hidden="true" /> Pause
                  </>
                )}
              </Button>
            )}
            {d.status === "failed" && (
              <Button
                size="sm"
                className="h-10 flex-1 rounded-xl sm:flex-none"
                onClick={() => onRetry(d.id)}
              >
                <RotateCcw className="size-4" aria-hidden="true" /> Retry
              </Button>
            )}
            {d.status === "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 rounded-xl sm:flex-none"
                onClick={() => onRetry(d.id)}
              >
                <RotateCcw className="size-4" aria-hidden="true" /> Start again
              </Button>
            )}
            {d.status === "ready" || d.status === "cancelled" || d.status === "failed" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 flex-1 rounded-xl sm:flex-none"
                onClick={() => onDismiss(d.id)}
              >
                <X className="size-4" aria-hidden="true" /> Dismiss
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 flex-1 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
                onClick={() => onCancel(d.id)}
              >
                <X className="size-4" aria-hidden="true" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
