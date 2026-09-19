import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { PLATFORM_SERVICES } from "@/lib/vidleaf/services";
import { cn } from "@/lib/utils";

export interface SectionLink {
  href: string;
  label: string;
  badge?: number | undefined;
}

interface Props {
  sectionLinks?: SectionLink[];
  ctaHref?: string;
  ctaLabel?: string;
}

export function SiteHeader({ sectionLinks = [], ctaHref = "#top", ctaLabel = "Get started" }: Props) {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) setServicesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setServicesOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link to="/" className="min-w-0" aria-label="VidLeaf home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          <li ref={servicesRef} className="relative">
            <button
              type="button"
              onClick={() => setServicesOpen((value) => !value)}
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-dark"
            >
              Services
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", servicesOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card p-2 shadow-lift">
                {PLATFORM_SERVICES.map((service) => (
                  <Link
                    key={service.id}
                    to={service.to}
                    onClick={() => setServicesOpen(false)}
                    className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
                    activeProps={{ className: "bg-secondary" }}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-dark">
                      <service.icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{service.name}</span>
                      <span className="block text-xs text-muted-foreground">{service.tagline}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </li>

          {sectionLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-dark"
              >
                {link.label}
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    {link.badge}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>

        <a
          href={ctaHref}
          className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-dark hover:shadow-lift md:inline-flex"
        >
          {ctaLabel}
        </a>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-foreground transition-colors hover:bg-secondary md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      <div
        className={cn("fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
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
            "absolute right-0 top-0 flex h-dvh w-[min(84vw,20rem)] flex-col gap-2 overflow-y-auto border-l border-border bg-background p-5 shadow-lift transition-transform duration-300",
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

          <p className="mt-4 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Services</p>
          <ul className="flex flex-col gap-1">
            {PLATFORM_SERVICES.map((service) => (
              <li key={service.id}>
                <Link
                  to={service.to}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                  activeProps={{ className: "bg-secondary" }}
                >
                  <service.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>

          {sectionLinks.length > 0 && (
            <>
              <p className="mt-4 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                On this page
              </p>
              <ul className="flex flex-col gap-1">
                {sectionLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      {link.label}
                      {link.badge !== undefined && link.badge > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          {link.badge}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          <a
            href={ctaHref}
            onClick={() => setOpen(false)}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </header>
  );
}
