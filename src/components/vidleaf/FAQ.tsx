import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Which formats are supported?",
    a: "VidLeaf shows MP4 and WebM for video, plus M4A and MP3 for audio-only downloads. The format for each option is listed next to its estimated file size.",
  },
  {
    q: "What resolutions can I choose?",
    a: "Anything the source offers, from 4K (2160p) and 2K (1440p) down through 1080p, 720p, 480p, 360p, 240p and 144p. Options the source doesn't provide are shown as unavailable.",
  },
  {
    q: "How are download times estimated?",
    a: "Your browser divides the file size in bits by your selected connection speed in bits per second, then adds about 10% overhead. Pick a preset or enter a custom speed for a closer estimate.",
  },
  {
    q: "Where is my download history stored?",
    a: "History lives in your browser's local storage on this device only. Nothing is uploaded, and clearing the history removes it permanently.",
  },
  {
    q: "Does VidLeaf work on mobile?",
    a: "Yes. The layout is mobile-first, works from 320px wide, uses large touch targets, and turns history rows into cards on small screens.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </header>

        <div className="mt-10 space-y-3">
          {ITEMS.map((item, i) => {
            const expanded = open === i;
            return (
              <div key={item.q} className="surface-panel overflow-hidden">
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-button-${i}`}
                    onClick={() => setOpen(expanded ? null : i)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-foreground transition-colors hover:bg-secondary/60 sm:text-base"
                  >
                    {item.q}
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-primary transition-transform duration-300",
                        expanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  hidden={!expanded}
                  className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
