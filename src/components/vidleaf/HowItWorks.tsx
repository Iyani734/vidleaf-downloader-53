import { CheckCircle2, Download, Link as LinkIcon, Settings2 } from "lucide-react";

const STEPS = [
  {
    icon: LinkIcon,
    title: "Paste a Link",
    body: "Copy a public video link and paste it into the box above. VidLeaf checks the link instantly.",
  },
  {
    icon: Settings2,
    title: "Choose Quality",
    body: "Pick from 4K down to 144p, or grab audio only. Each option shows format and estimated size.",
  },
  {
    icon: Download,
    title: "Download",
    body: "Start the download and watch live progress. Everything lands in My Downloads when it's ready.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-secondary/70 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            How it works
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Three steps, no clutter
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            VidLeaf keeps the flow short: link in, quality chosen, file ready.
          </p>
        </header>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="surface-panel relative p-6">
              <span className="absolute right-5 top-5 text-4xl font-black text-primary/10">
                0{i + 1}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                <step.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
          No sign-up, no pop-ups, no misleading buttons.
        </p>
      </div>
    </section>
  );
}
