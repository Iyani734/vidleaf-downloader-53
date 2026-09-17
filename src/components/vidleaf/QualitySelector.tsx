import { Check, FileVideo, Music, Sparkles } from "lucide-react";
import type { QualityOption } from "@/lib/vidleaf/types";
import { formatBytes } from "@/lib/vidleaf/format";
import { cn } from "@/lib/utils";

interface QualitySelectorProps {
  qualities: QualityOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function QualitySelector({ qualities, selectedId, onSelect }: QualitySelectorProps) {
  if (qualities.length === 0) {
    return (
      <div className="surface-panel flex flex-col items-center gap-2 p-8 text-center">
        <FileVideo className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-semibold">No formats available</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t find any downloadable formats for this link. Try a different public
          video.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="surface-panel p-5">
      <legend className="px-1 text-base font-bold text-foreground">Choose a quality</legend>
      <p className="mb-4 text-sm text-muted-foreground">
        Exact resolution and format are shown. The highest detected option is recommended.
      </p>
      <div
        role="radiogroup"
        aria-label="Download quality"
        className="grid max-h-[26rem] gap-2 overflow-y-auto pr-1"
      >
        {qualities.map((q) => {
          const selected = q.id === selectedId;
          const Icon = q.kind === "audio" ? Music : FileVideo;
          return (
            <button
              key={q.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!q.available}
              onClick={() => onSelect(q.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                selected
                  ? "border-primary bg-secondary shadow-soft"
                  : "border-border bg-card hover:border-primary/50 hover:bg-secondary/60",
                !q.available && "cursor-not-allowed opacity-45 hover:border-border hover:bg-card",
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{q.label}</span>
                  {q.recommended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary-dark">
                      <Sparkles className="h-3 w-3" aria-hidden="true" /> Highest detected
                    </span>
                  )}
                  {!q.available && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Unavailable
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {!q.available ? (
                    "Not detected for this video"
                  ) : (
                    <>
                      {q.kind === "video" ? `${q.resolution} - ` : ""}
                      {q.format}
                      {q.fps ? ` - ${q.fps} fps` : ""} - ~{formatBytes(q.sizeBytes)}
                    </>
                  )}
                </span>
              </span>

              {selected && (
                <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
