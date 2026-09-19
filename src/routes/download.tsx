import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/vidleaf/SiteHeader";
import { HeroDownloader } from "@/components/vidleaf/HeroDownloader";
import { DownloadTabs } from "@/components/vidleaf/DownloadTabs";
import { HowItWorks } from "@/components/vidleaf/HowItWorks";
import { FAQ } from "@/components/vidleaf/FAQ";
import { Footer } from "@/components/vidleaf/Footer";
import { useDownloads } from "@/hooks/useDownloads";
import type { HistoryItem } from "@/lib/vidleaf/types";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Video Downloader — VidLeaf" },
      {
        name: "description",
        content:
          "Paste a public video link, pick 4K to 144p or audio only, see size and time estimates, and track downloads in one clean, ad-free interface.",
      },
      { property: "og:title", content: "Video Downloader — VidLeaf" },
      {
        property: "og:description",
        content: "Download videos in the quality you want, with live progress and local download history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const downloads = useDownloads();
  const [presetUrl, setPresetUrl] = useState<string | undefined>(undefined);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const handleCopyLink = (item: HistoryItem) => {
    void navigator.clipboard
      ?.writeText(item.url)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.error("Couldn't copy the link"));
  };

  const handleDownloadAgain = (item: HistoryItem) => {
    setPresetUrl(`${item.url}#${Date.now()}`);
    toast.success("Link loaded in the downloader", { description: item.title });
    document.getElementById("downloader")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="top" className="min-h-dvh bg-background">
      <SiteHeader
        ctaHref="#downloader"
        ctaLabel="Start downloading"
        sectionLinks={[
          { href: "#downloader", label: "Downloader" },
          { href: "#my-downloads", label: "My Downloads", badge: downloads.activeCount },
          { href: "#how-it-works", label: "How It Works" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      {offline && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-semibold text-destructive-foreground"
        >
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          You&apos;re offline. Downloads will resume once your connection is back.
        </div>
      )}

      <main>
        <HeroDownloader
          presetUrl={presetUrl}
          onStartDownload={async (video, quality, speed) => {
            await downloads.startDownload(video, quality, speed);
            toast.success("Download started", { description: `${video.title} · ${quality.label}` });
            document.getElementById("my-downloads")?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <DownloadTabs
          active={downloads.active}
          history={downloads.history}
          activeCount={downloads.activeCount}
          onTogglePause={downloads.togglePause}
          onCancel={(id) => {
            downloads.cancelDownload(id);
            toast("Download cancelled");
          }}
          onRetry={downloads.retryDownload}
          onDismiss={downloads.dismissDownload}
          onDownloadAgain={handleDownloadAgain}
          onCopyLink={handleCopyLink}
          onRemoveHistory={(id) => {
            downloads.removeHistoryItem(id);
            toast("Removed from history");
          }}
          onClearHistory={() => {
            downloads.clearHistory();
            toast("History cleared");
          }}
        />

        <HowItWorks />
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
