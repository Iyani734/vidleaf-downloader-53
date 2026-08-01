import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Which formats does VidLeaf support?",
    a: "Video downloads are offered as MP4 or WebM, and audio-only downloads as MP3 or M4A. The available combinations depend on what the source link exposes.",
  },
  {
    q: "What resolutions can I choose?",
    a: "Everything from 144p up to 4K / 2160p, plus a Best Quality option that automatically picks the highest stream available. Audio-only is always offered.",
  },
  {
    q: "How are download times estimated?",
    a: "Your browser divides the file size in bits by your selected connection speed in bits per second and adds about 10% overhead, so you get a realistic estimate before you start.",
  },
  {
    q: "Where is my download history stored?",
    a: "History is saved locally in your browser storage on this device only. It survives a refresh, and you can remove single entries or clear everything at any time.",
  },
  {
    q: "Does VidLeaf work on mobile?",
    a: "Yes. The interface is mobile-first, works from 320px wide upward, uses large touch targets, and adapts history rows into readable cards on small screens.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <header className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            Questions, answered
          </h2>
        </header>

        <Accordion type="single" collapsible className="mt-8 space-y-3">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`faq-${i}`}
              className="surface-card border-b px-5 data-[state=open]:bg-primary-soft/50"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
