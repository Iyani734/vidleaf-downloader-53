import { ClipboardPaste, ListChecks, ArrowDownToLine } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardPaste,
    title: "Paste a Link",
    body: "Copy the address of any public video and drop it into the field above. VidLeaf reads the details instantly.",
  },
  {
    icon: ListChecks,
    title: "Choose Quality",
    body: "Compare resolutions, formats, frame rates and file sizes side by side — or grab audio only.",
  },
  {
    icon: ArrowDownToLine,
    title: "Download",
    body: "Watch live progress, pause or resume any time, and find every finished file in your history.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-primary-soft/70 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            Three steps, no clutter
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            A calm, predictable flow from link to finished file.
          </p>
        </header>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="surface-card group relative p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <span className="absolute right-5 top-5 font-display text-4xl font-black text-border">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                <step.icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
