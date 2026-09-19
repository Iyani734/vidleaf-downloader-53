import { Info } from "lucide-react";
import type { EnhancementOption } from "@/lib/vidleaf/audioService";
import { cn } from "@/lib/utils";

interface Props {
  options: EnhancementOption[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export function EnhancementPicker({ options, selected, onToggle, disabled = false }: Props) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">Select enhancement type</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick as many as you need — VidLeaf applies them in the right order in one pass.
          </p>
        </div>
        <span
          className="mt-1 hidden shrink-0 text-muted-foreground sm:block"
          title="Each choice maps to a professional audio filter applied on our servers."
        >
          <Info className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5" role="group" aria-label="Enhancement options">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              disabled={disabled}
              aria-pressed={active}
              title={option.description}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-secondary text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary-dark",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
