import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            VidLeaf is a clean, ad-free interface for saving public videos in the quality you
            actually want.
          </p>
        </div>

        <nav aria-label="Product">
          <h2 className="text-sm font-bold text-foreground">Product</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="#downloader"
                className="text-muted-foreground transition-colors hover:text-primary-dark"
              >
                Downloader
              </a>
            </li>
            <li>
              <a
                href="#my-downloads"
                className="text-muted-foreground transition-colors hover:text-primary-dark"
              >
                My Downloads
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="text-muted-foreground transition-colors hover:text-primary-dark"
              >
                FAQ
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 className="text-sm font-bold text-foreground">Legal</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="#faq"
                className="text-muted-foreground transition-colors hover:text-primary-dark"
              >
                Terms
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="text-muted-foreground transition-colors hover:text-primary-dark"
              >
                Privacy
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>(c) {new Date().getFullYear()} VidLeaf. Real downloads powered by the VidLeaf API.</p>
          <p>Please download only content you own or have permission to use.</p>
        </div>
      </div>
    </footer>
  );
}
