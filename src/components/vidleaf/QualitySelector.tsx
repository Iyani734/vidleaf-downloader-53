import { Check, Music4, Video, Ban } from "lucide-react";
import { formatSize } from "@/lib/vidleaf/format";
import type { QualityOption } from "@/lib/vidleaf/types";

interface Props {
  options: QualityOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function QualitySelector({ options, selectedId, onSelect }: Props) {
  if (options.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <Ban className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-3 font-bold text-foreground">No formats available</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This link doesn't expose any downloadable streams. Try a different video.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="surface-card p-4 sm:p-5">
      <legend className="px-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Choose quality
      </legend>
      <div
        role="radiogroup"
        aria-label="Download quality"
        className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1"
      >
        {options.map((opt) => {
          const selected = opt.id === selectedId;
          const Icon = opt.kind === "audio" ? Music4 : Video;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!opt.available}
              onClick={() => onSelect(opt.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${
                selected
                  ? "border-primary bg-primary-soft shadow-soft"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary-soft/60"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary-dark"
                }`}
              >
                <Icon className="size-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{opt.label}</span>
                  {opt.recommended && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                      Recommended
                    </span>
                  )}
                  {!opt.available && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Unavailable
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {opt.resolution} · {opt.format}
                  {opt.fps ? ` · ${opt.fps} fps` : ""}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold text-foreground">
                  {formatSize(opt.sizeMB)}
                </span>
                {selected && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <Check className="size-3.5" aria-hidden="true" /> Selected
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
