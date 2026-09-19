import { CheckCircle2, Download, Loader2, X, XCircle } from "lucide-react";
import type { AudioCleanupJob } from "@/hooks/useAudioCleanup";
import { formatBytes } from "@/lib/vidleaf/format";
import { cn } from "@/lib/utils";

interface Props {
  job: AudioCleanupJob;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function CleanupJobCard({ job, onCancel, onDismiss }: Props) {
  const done = job.status === "ready";
  const failed = job.status === "failed" || job.status === "cancelled" || job.status === "expired";

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            done ? "bg-primary/10 text-primary-dark" : failed ? "bg-destructive/10 text-destructive" : "bg-secondary",
          )}
        >
          {done ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : failed ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{job.filename}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {job.error ?? job.message}
            {job.sizeBytes ? ` · ${formatBytes(job.sizeBytes)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (done || failed ? onDismiss(job.id) : onCancel(job.id))}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border transition-colors hover:bg-secondary"
          aria-label={done || failed ? "Dismiss" : "Cancel cleanup"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!done && !failed && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.max(2, Math.min(100, job.progress))}%` }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {job.enhancements.map((id) => (
          <span key={id} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {id.replace(/_/g, " ")}
          </span>
        ))}
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase text-muted-foreground">
          {job.outputFormat}
        </span>
      </div>

      {done && job.downloadUrl && (
        <a
          href={job.downloadUrl}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download cleaned audio
        </a>
      )}
    </article>
  );
}
