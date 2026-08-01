import { ArrowDownToLine, Inbox } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ActiveDownloadCard } from "./ActiveDownloadCard";
import { DownloadHistory } from "./DownloadHistory";
import { useDownloads } from "@/lib/vidleaf/store";
import type { HistoryItem } from "@/lib/vidleaf/types";

export function DownloadTabs({
  onDownloadAgain,
}: {
  onDownloadAgain: (item: HistoryItem) => void;
}) {
  const { active, togglePause, cancelDownload, retryDownload, dismissDownload } = useDownloads();
  const runningCount = active.filter(
    (d) => d.status === "downloading" || d.status === "preparing" || d.status === "processing",
  ).length;

  return (
    <Tabs defaultValue="downloading" className="w-full">
      <TabsList className="h-12 w-full rounded-xl bg-secondary p-1 sm:w-auto">
        <TabsTrigger value="downloading" className="h-10 flex-1 rounded-lg px-4 text-sm font-semibold sm:flex-none">
          Downloading
          <span
            className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
              runningCount > 0
                ? "bg-primary text-primary-foreground"
                : "bg-border text-muted-foreground"
            }`}
          >
            {runningCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="history" className="h-10 flex-1 rounded-lg px-4 text-sm font-semibold sm:flex-none">
          Download History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="downloading" className="mt-5">
        {active.length === 0 ? (
          <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Inbox className="size-8" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">
              Nothing downloading right now
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Paste a link above, pick a quality, and your progress will show up here.
            </p>
            <Button asChild className="mt-5 h-11 rounded-xl">
              <a href="#downloader">
                <ArrowDownToLine className="size-4" aria-hidden="true" /> Go to downloader
              </a>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3" aria-live="polite">
            {active.map((d) => (
              <ActiveDownloadCard
                key={d.id}
                download={d}
                onTogglePause={togglePause}
                onCancel={cancelDownload}
                onRetry={retryDownload}
                onDismiss={dismissDownload}
              />
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="history" className="mt-5">
        <DownloadHistory onDownloadAgain={onDownloadAgain} />
      </TabsContent>
    </Tabs>
  );
}
