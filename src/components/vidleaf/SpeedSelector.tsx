import { Gauge } from "lucide-react";
import { SPEED_PRESETS } from "@/lib/vidleaf/mockData";
import type { SpeedPresetId } from "@/lib/vidleaf/types";

interface Props {
  presetId: SpeedPresetId;
  customMbps: number;
  onPresetChange: (id: SpeedPresetId) => void;
  onCustomChange: (mbps: number) => void;
}

export function SpeedSelector({ presetId, customMbps, onPresetChange, onCustomChange }: Props) {
  return (
    <div className="rounded-xl border border-border bg-primary-soft/60 p-4">
      <label
        htmlFor="speed-preset"
        className="flex items-center gap-2 text-sm font-semibold text-foreground"
      >
        <Gauge className="size-4 text-primary" aria-hidden="true" />
        Your internet speed (optional)
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          id="speed-preset"
          value={presetId}
          onChange={(e) => onPresetChange(e.target.value as SpeedPresetId)}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
        >
          {SPEED_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {presetId === "custom" && (
          <div className="flex items-center gap-2">
            <label htmlFor="custom-speed" className="sr-only">
              Custom speed in Mbps
            </label>
            <input
              id="custom-speed"
              type="number"
              min={1}
              max={2000}
              value={customMbps}
              onChange={(e) => onCustomChange(Math.max(1, Number(e.target.value) || 1))}
              className="h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground"
            />
            <span className="shrink-0 text-sm font-medium text-muted-foreground">Mbps</span>
          </div>
        )}
      </div>
    </div>
  );
}
