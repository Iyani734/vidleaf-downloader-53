import { Download, HardDrive, Loader2, Timer } from "lucide-react";
import type { QualityOption } from "@/lib/vidleaf/types";
import { estimateSeconds, formatBytes, friendlyEta } from "@/lib/vidleaf/format";
import { SpeedSelector } from "./SpeedSelector";

interface DownloadSummaryProps {
  quality: QualityOption;
  speedMbps: number;
  customSpeed: boolean;
  onSpeedChange: (mbps: number, custom: boolean) => void;
  onDownload: () => void;
  starting: boolean;
}

export function DownloadSummary({
  quality,
  speedMbps,
  customSpeed,
  onSpeedChange,
  onDownload,
  starting,
}: DownloadSummaryProps) {
  const eta = friendlyEta(estimateSeconds(quality.sizeBytes, speedMbps));

  return (
    <section aria-label="Download summary" className="surface-panel space-y-5 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryRow label="Selected quality" value={quality.label} />
        <SummaryRow label="Format" value={quality.format} />
        <SummaryRow
          label="Estimated size"
          value={formatBytes(quality.sizeBytes)}
          icon={<HardDrive className="h-4 w-4 text-primary" aria-hidden="true" />}
        />
        <SummaryRow
          label="Estimated time"
          value={eta}
          icon={<Timer className="h-4 w-4 text-primary" aria-hidden="true" />}
        />
      </div>

      <SpeedSelector speedMbps={speedMbps} custom={customSpeed} onChange={onSpeedChange} />

      <button
        type="button"
        onClick={onDownload}
        disabled={starting || !quality.available}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-dark hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-70"
      >
        {starting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Preparing download…
          </>
        ) : (
          <>
            <Download className="h-5 w-5" aria-hidden="true" /> Download Video
          </>
        )}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Real backend download — only download content you&apos;re permitted to use.
      </p>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-foreground">
        {icon}
        {value}
      </p>
    </div>
  );
}
