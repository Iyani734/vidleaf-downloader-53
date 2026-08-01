import { Download, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeedSelector } from "./SpeedSelector";
import { estimateSeconds, formatSize, friendlyEta } from "@/lib/vidleaf/format";
import type { QualityOption, SpeedPresetId } from "@/lib/vidleaf/types";

interface Props {
  quality: QualityOption;
  presetId: SpeedPresetId;
  customMbps: number;
  speedMbps: number;
  onPresetChange: (id: SpeedPresetId) => void;
  onCustomChange: (mbps: number) => void;
  onDownload: () => void;
  busy: boolean;
}

export function DownloadSummary({
  quality,
  presetId,
  customMbps,
  speedMbps,
  onPresetChange,
  onCustomChange,
  onDownload,
  busy,
}: Props) {
  const eta = friendlyEta(estimateSeconds(quality.sizeMB, speedMbps));

  const rows: Array<[string, string]> = [
    ["Quality", quality.label],
    ["Format", quality.format],
    ["Estimated size", formatSize(quality.sizeMB)],
    ["Estimated time", eta],
  ];

  return (
    <section aria-label="Download summary" className="surface-card p-5">
      <h3 className="font-display text-base font-bold text-foreground">Download summary</h3>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-secondary/60 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 truncate text-sm font-bold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <SpeedSelector
          presetId={presetId}
          customMbps={customMbps}
          onPresetChange={onPresetChange}
          onCustomChange={onCustomChange}
        />
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Timer className="size-4 shrink-0 text-primary" aria-hidden="true" />
        At {speedMbps} Mbps this download takes {eta.toLowerCase()}.
      </p>

      <Button
        onClick={onDownload}
        disabled={busy || !quality.available}
        className="mt-4 h-14 w-full rounded-2xl text-base font-bold shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <Download className="size-5" aria-hidden="true" />
        {busy ? "Preparing download…" : "Download Video"}
      </Button>
    </section>
  );
}
