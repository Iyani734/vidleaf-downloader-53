import { Download, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Leaf className="h-5 w-5" aria-hidden="true" />
        <Download
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary-dark p-[2px]"
          aria-hidden="true"
        />
      </span>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight text-foreground">
          Vid<span className="text-primary">Leaf</span>
        </span>
      )}
    </span>
  );
}
