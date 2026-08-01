import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Navbar } from "@/components/vidleaf/Navbar";
import { HeroDownloader } from "@/components/vidleaf/HeroDownloader";
import { DownloadTabs } from "@/components/vidleaf/DownloadTabs";
import { HowItWorks } from "@/components/vidleaf/HowItWorks";
import { FAQ } from "@/components/vidleaf/FAQ";
import { Footer } from "@/components/vidleaf/Footer";
import { DownloadProvider, useDownloads } from "@/lib/vidleaf/store";
import type { HistoryItem, QualityOption, VideoInfo } from "@/lib/vidleaf/types";

const TITLE = "VidLeaf — Download Videos in the Quality You Want";
const DESCRIPTION =
  "Paste a public video link, compare resolutions and formats, and download with clear size and time estimates. Ad-free and mobile friendly.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <DownloadProvider>
      <VidLeafPage />
    </DownloadProvider>
  ),
});

function VidLeafPage() {
  const { startDownload } = useDownloads();

  // Re-runs a finished download using the stored history metadata.
  const handleDownloadAgain = (item: HistoryItem) => {
    const quality: QualityOption = {
      id: `again-${item.id}`,
      label: item.qualityLabel,
      resolution: item.resolution,
      height: item.height,
      kind: item.kind,
      format: item.format,
      sizeMB: item.sizeMB,
      available: true,
    };
    const video: VideoInfo = {
      id: item.id,
      url: item.url,
      title: item.title,
      channel: item.channel,
      thumbnail: item.thumbnail,
      durationSeconds: item.durationSeconds,
      uploadedAt: item.completedAt,
      qualities: [quality],
    };
    startDownload(video, quality, 20);
    toast.success("Download restarted", { description: item.qualityLabel });
  };

  return (
    <div id="top" className="min-h-dvh bg-background">
      <Navbar />
      <main>
        <HeroDownloader />

        <section id="my-downloads" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <header className="mb-6 max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                My Downloads
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
                Track everything in one place
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Live progress for active transfers and a searchable history saved on this device.
              </p>
            </header>
            <DownloadTabs onDownloadAgain={handleDownloadAgain} />
          </div>
        </section>

        <HowItWorks />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
