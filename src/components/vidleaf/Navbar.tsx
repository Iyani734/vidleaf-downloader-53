import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#downloader", label: "Downloader" },
  { href: "#my-downloads", label: "My Downloads" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar({ activeCount }: { activeCount: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <a href="#top" className="min-w-0" aria-label="VidLeaf home">
          <Logo />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-dark"
              >
                {l.label}
                {l.href === "#my-downloads" && activeCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#downloader"
          className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-dark hover:shadow-lift md:inline-flex"
        >
          Start downloading
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-foreground transition-colors hover:bg-secondary md:hidden"
        >
          {open ? <Menu className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Slide-out mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-foreground/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          id="mobile-menu"
          className={cn(
            "absolute right-0 top-0 flex h-dvh w-[min(84vw,20rem)] flex-col gap-2 border-l border-border bg-background p-5 shadow-lift transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="grid h-11 w-11 place-items-center rounded-xl border border-border transition-colors hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ul className="mt-4 flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  {l.label}
                  {l.href === "#my-downloads" && activeCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#downloader"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark"
          >
            Start downloading
          </a>
        </div>
      </div>
    </header>
  );
}
