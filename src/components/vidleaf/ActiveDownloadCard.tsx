import { Download, Pause, Play, RotateCcw, Trash2, X } from "lucide-react";
import type { ActiveDownload } from "@/lib/vidleaf/types";
import { formatBytes, formatSpeed, preciseEta } from "@/lib/vidleaf/format";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<ActiveDownload["status"], string> = {
  preparing: "Preparing",
  downloading: "Downloading",
  paused: "Paused",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
  cancelled: "Cancelled",
};

interface Props {
  item: ActiveDownload;
  onTogglePause: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ActiveDownloadCard({ item, onTogglePause, onCancel, onRetry, onDismiss }: Props) {
  const pct =
    item.totalBytes > 0 ? Math.min(100, (item.receivedBytes / item.totalBytes) * 100) : 0;
  const remainingBytes = Math.max(0, item.totalBytes - item.receivedBytes);
  const eta =
    item.status === "downloading" && item.speedBps > 0
      ? preciseEta(remainingBytes / item.speedBps)
      : "—";
  const done = item.status === "ready";
  const stopped = item.status === "cancelled" || item.status === "failed";

  return (
    <article className="surface-panel flex flex-col gap-4 p-4 sm:flex-row">
      <img
        src={item.thumbnail}
        alt=""
        loading="lazy"
        className="h-32 w-full shrink-0 rounded-xl object-cover sm:h-20 sm:w-36"
      />

      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">{item.title}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.qualityLabel} · {item.format}
              {item.kind === "video" ? ` · ${item.resolution}` : ""}
            </p>
          </div>
          <StatusPill status={item.status} />
        </div>

        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Download progress for ${item.title}`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              stopped ? "bg-destructive" : done ? "bg-primary-dark" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="sr-only" aria-live="polite">
          {STATUS_TEXT[item.status]} {Math.round(pct)} percent
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{Math.round(pct)}%</span>
          <span>
            {formatBytes(item.receivedBytes)} / {formatBytes(item.totalBytes)}
          </span>
          {item.status === "downloading" && <span>{formatSpeed(item.speedBps)}</span>}
          {item.status === "downloading" && <span>{eta}</span>}
          {item.error && <span className="font-medium text-destructive">{item.error}</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!done && !stopped && item.canPause && (
            <ActionButton
              onClick={() => onTogglePause(item.id)}
              icon={item.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              label={item.status === "paused" ? "Resume" : "Pause"}
            />
          )}
          {done && item.downloadUrl && (
            <a
              href={item.downloadUrl}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download file
            </a>
          )}
          {item.status === "failed" && (
            <ActionButton
              onClick={() => onRetry(item.id)}
              icon={<RotateCcw className="h-4 w-4" />}
              label="Retry"
            />
          )}
          {!done && !stopped && (
            <ActionButton
              onClick={() => onCancel(item.id)}
              icon={<X className="h-4 w-4" />}
              label="Cancel"
              destructive
            />
          )}
          {(done || stopped) && (
            <ActionButton
              onClick={() => onDismiss(item.id)}
              icon={<Trash2 className="h-4 w-4" />}
              label="Remove"
            />
          )}
        </div>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: ActiveDownload["status"] }) {
  const tone =
    status === "failed" || status === "cancelled"
      ? "bg-destructive/10 text-destructive"
      : status === "ready"
        ? "bg-primary/10 text-primary-dark"
        : status === "paused"
          ? "bg-muted text-muted-foreground"
          : "bg-secondary text-primary-dark";
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", tone)}>
      {STATUS_TEXT[status]}
    </span>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  destructive = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
        destructive
          ? "border-destructive/30 text-destructive hover:bg-destructive/10"
          : "border-border text-foreground hover:bg-secondary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
