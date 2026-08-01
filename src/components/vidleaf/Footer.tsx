import { ShieldCheck } from "lucide-react";
import { VidLeafLogo } from "./VidLeafLogo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary-soft/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="max-w-sm">
            <VidLeafLogo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A clean, ad-free way to save public videos in the quality you actually want — with
              clear estimates and a tidy download history.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h2 className="font-bold text-foreground">Product</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="#downloader" className="text-muted-foreground hover:text-primary-dark">
                    Downloader
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-primary-dark">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="font-bold text-foreground">Legal</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-primary-dark">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-primary-dark">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <p className="mt-10 flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          Please download only content you own or have permission to use, and respect each
          platform's terms of service.
        </p>

        <p className="mt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} VidLeaf. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
