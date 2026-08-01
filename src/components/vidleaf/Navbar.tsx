import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { VidLeafLogo } from "./VidLeafLogo";
import { Button } from "@/components/ui/button";
import { useDownloads } from "@/lib/vidleaf/store";

const LINKS = [
  { href: "#downloader", label: "Downloader" },
  { href: "#my-downloads", label: "My Downloads" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { active } = useDownloads();
  const activeCount = active.filter(
    (d) => d.status === "downloading" || d.status === "preparing" || d.status === "paused" || d.status === "processing",
  ).length;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="rounded-lg" aria-label="VidLeaf home">
          <VidLeafLogo />
        </a>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-dark"
            >
              {link.label}
              {link.label === "My Downloads" && activeCount > 0 && (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild size="sm" className="rounded-xl">
            <a href="#downloader">Get Video</a>
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-xl md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Menu className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Slide-out mobile navigation */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-foreground/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className={`absolute right-0 top-0 flex h-dvh w-[86%] max-w-xs flex-col gap-1 border-l border-border bg-background p-5 shadow-lift transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <VidLeafLogo />
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-xl"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:bg-primary-soft"
            >
              {link.label}
              {link.label === "My Downloads" && activeCount > 0 && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </a>
          ))}
          <Button asChild className="mt-4 h-12 w-full rounded-xl text-base">
            <a href="#downloader" onClick={() => setOpen(false)}>
              Get Video
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
