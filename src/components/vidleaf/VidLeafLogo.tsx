import { Leaf, ArrowDownToLine } from "lucide-react";

export function VidLeafLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft"
      >
        <Leaf className="size-5" strokeWidth={2.2} />
        <ArrowDownToLine
          className="absolute -bottom-1 -right-1 size-4 rounded-full bg-primary-dark p-0.5 text-primary-foreground ring-2 ring-background"
          strokeWidth={2.6}
        />
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
        Vid<span className="text-primary">Leaf</span>
      </span>
    </span>
  );
}
