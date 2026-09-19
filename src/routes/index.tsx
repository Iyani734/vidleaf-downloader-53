import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { SiteHeader } from "@/components/vidleaf/SiteHeader";
import { Footer } from "@/components/vidleaf/Footer";
import { PLATFORM_SERVICES } from "@/lib/vidleaf/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VidLeaf — Media Tools That Just Work" },
      {
        name: "description",
        content:
          "One clean, ad-free workspace for your media: download videos in any quality and clean up noisy audio recordings in seconds.",
      },
      { property: "og:title", content: "VidLeaf — Media Tools That Just Work" },
      {
        property: "og:description",
        content: "Download videos in any quality and clean up noisy audio recordings — all in one ad-free workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Hub,
});

const PROMISES = [
  { icon: Zap, title: "Fast by default", body: "Jobs run on our servers, so your laptop stays free." },
  { icon: ShieldCheck, title: "Private files", body: "Your files are stored privately and removed automatically." },
  { icon: Sparkles, title: "No ads, ever", body: "One clean interface — no pop-ups, no redirects, no clutter." },
];

function Hub() {
  return (
    <div id="top" className="min-h-dvh bg-background">
      <SiteHeader ctaHref="#services" ctaLabel="Browse services" />

      <main>
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-dark">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Media tools
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              Everything your media needs,
              <br className="hidden sm:block" /> in <span className="text-primary">one place</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Pick a service below. Each one has its own focused workspace — no clutter, no ads, no sign-up.
            </p>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {PLATFORM_SERVICES.map((service) => (
              <Link
                key={service.id}
                to={service.to}
                className="group flex flex-col rounded-3xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary-dark">
                  <service.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">{service.name}</h2>
                <p className="mt-1 text-sm font-semibold text-primary-dark">{service.tagline}</p>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{service.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  Open service
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="rounded-2xl border border-border bg-secondary/40 p-6">
                <promise.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-base font-bold text-foreground">{promise.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{promise.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
