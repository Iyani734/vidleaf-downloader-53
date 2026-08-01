import { useMemo, useState } from "react";
import { FolderOpen, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HistoryCard } from "./HistoryCard";
import { ConfirmationModal } from "./ConfirmationModal";
import { useDownloads } from "@/lib/vidleaf/store";
import type { HistoryItem } from "@/lib/vidleaf/types";

const PAGE_SIZE = 4;

type KindFilter = "all" | "video" | "audio";
type SortKey = "newest" | "oldest" | "largest" | "smallest";

export function DownloadHistory({ onDownloadAgain }: { onDownloadAgain: (item: HistoryItem) => void }) {
  const { history, hydrated, removeHistoryItem, clearHistory } = useDownloads();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [resolution, setResolution] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [confirmClear, setConfirmClear] = useState(false);

  const resolutions = useMemo(() => {
    const set = new Set(history.map((h) => h.qualityLabel));
    return Array.from(set).sort();
  }, [history]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = history.filter((h) => {
      if (q && !h.title.toLowerCase().includes(q) && !h.channel.toLowerCase().includes(q))
        return false;
      if (kind !== "all" && h.kind !== kind) return false;
      if (resolution !== "all" && h.qualityLabel !== resolution) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return +new Date(a.completedAt) - +new Date(b.completedAt);
        case "largest":
          return b.sizeMB - a.sizeMB;
        case "smallest":
          return a.sizeMB - b.sizeMB;
        default:
          return +new Date(b.completedAt) - +new Date(a.completedAt);
      }
    });
    return sorted;
  }, [history, query, kind, resolution, sort]);

  const shown = filtered.slice(0, visible);

  const copyLink = async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  if (!hydrated) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        Loading your history…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative min-w-0">
          <label htmlFor="history-search" className="sr-only">
            Search downloads by title
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Search by title or creator…"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="filter-kind" className="sr-only">
            Filter by media type
          </label>
          <select
            id="filter-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as KindFilter)}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground md:w-36"
          >
            <option value="all">All media</option>
            <option value="video">Video only</option>
            <option value="audio">Audio only</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-res" className="sr-only">
            Filter by resolution
          </label>
          <select
            id="filter-res"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground md:w-44"
          >
            <option value="all">All resolutions</option>
            {resolutions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort-key" className="sr-only">
            Sort downloads
          </label>
          <select
            id="sort-key"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground md:w-36"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="largest">Largest first</option>
            <option value="smallest">Smallest first</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "download" : "downloads"}
        </p>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" /> Clear history
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <FolderOpen className="size-8" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            {history.length === 0 ? "No downloads yet" : "Nothing matches those filters"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {history.length === 0
              ? "Your finished downloads will appear here, saved on this device."
              : "Try a different search term, media type, or resolution."}
          </p>
          <Button asChild className="mt-5 h-11 rounded-xl">
            <a href="#downloader">Start a download</a>
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {shown.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onDownloadAgain={onDownloadAgain}
                onCopyLink={copyLink}
                onRemove={(i) => {
                  removeHistoryItem(i.id);
                  toast.success("Removed from history");
                }}
              />
            ))}
          </ul>
          {visible < filtered.length && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="h-12 w-full rounded-xl sm:w-auto"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Load more ({filtered.length - visible} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear download history?"
        description="This permanently removes every item saved on this device. Files already saved to your computer are not affected."
        confirmLabel="Clear history"
        onConfirm={() => {
          clearHistory();
          setConfirmClear(false);
          toast.success("Download history cleared");
        }}
      />
    </div>
  );
}
