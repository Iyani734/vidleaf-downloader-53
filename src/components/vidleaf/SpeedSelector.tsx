import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

export const SPEED_PRESETS = [
  { id: "slow", label: "Slow", mbps: 5 },
  { id: "average", label: "Average", mbps: 20 },
  { id: "fast", label: "Fast", mbps: 50 },
  { id: "veryfast", label: "Very fast", mbps: 100 },
] as const;

interface SpeedSelectorProps {
  speedMbps: number;
  custom: boolean;
  onChange: (mbps: number, custom: boolean) => void;
}

export function SpeedSelector({ speedMbps, custom, onChange }: SpeedSelectorProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">Your internet speed</span>
      </div>
      <div role="radiogroup" aria-label="Internet speed" className="flex flex-wrap gap-2">
        {SPEED_PRESETS.map((p) => {
          const selected = !custom && speedMbps === p.mbps;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(p.mbps, false)}
              className={cn(
                "min-h-10 rounded-xl border px-3 text-xs font-semibold transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {p.label} — {p.mbps} Mbps
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          onClick={() => onChange(speedMbps, true)}
          className={cn(
            "min-h-10 rounded-xl border px-3 text-xs font-semibold transition-all",
            custom
              ? "border-primary bg-primary text-primary-foreground shadow-soft"
              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          Custom
        </button>
      </div>

      {custom && (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="custom-speed" className="text-xs font-medium text-muted-foreground">
            Custom speed (Mbps)
          </label>
          <input
            id="custom-speed"
            type="number"
            min={1}
            max={2000}
            value={speedMbps}
            onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1), true)}
            className="h-10 w-28 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
