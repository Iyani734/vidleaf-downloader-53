import { useMemo, useState } from "react";
import { History, Search, Trash2 } from "lucide-react";
import type { HistoryItem } from "@/lib/vidleaf/types";
import { HistoryCard } from "./HistoryCard";
import { ConfirmationModal } from "./ConfirmationModal";

type KindFilter = "all" | "video" | "audio";
type SortKey = "newest" | "oldest" | "largest" | "smallest";

const PAGE_SIZE = 4;

interface Props {
  history: HistoryItem[];
  onDownloadAgain: (item: HistoryItem) => void;
  onCopyLink: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function DownloadHistory({
  history,
  onDownloadAgain,
  onCopyLink,
  onRemove,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [resolution, setResolution] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resolutions = useMemo(
    () => Array.from(new Set(history.map((h) => h.resolution))).sort(),
    [history],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = history.filter((h) => {
      if (q && !h.title.toLowerCase().includes(q)) return false;
      if (kind !== "all" && h.kind !== kind) return false;
      if (resolution !== "all" && h.resolution !== resolution) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.completedAt - b.completedAt;
        case "largest":
          return b.sizeBytes - a.sizeBytes;
        case "smallest":
          return a.sizeBytes - b.sizeBytes;
        default:
          return b.completedAt - a.completedAt;
      }
    });
    return sorted;
  }, [history, query, kind, resolution, sort]);

  const shown = filtered.slice(0, visible);

  if (history.length === 0) {
    return (
      <div className="surface-panel flex flex-col items-center gap-3 p-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
          <History className="h-7 w-7" aria-hidden="true" />
        </span>
        <h3 className="text-base font-bold">No downloads yet</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Finished downloads appear here, saved on this device so they survive a page refresh.
        </p>
        <a
          href="#downloader"
          className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
        >
          Download your first video
        </a>
      </div>
    );
  }

  const selectClass =
    "min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="surface-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <label htmlFor="history-search" className="sr-only">
            Search downloads by title
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Search by title…"
            className="min-h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
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
            className={`${selectClass} w-full`}
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
            className={`${selectClass} w-full`}
          >
            <option value="all">All resolutions</option>
            {resolutions.map((r) => (
              <option key={r} value={r}>
                {r === "Audio" || r === "—" ? "Audio" : r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort-by" className="sr-only">
            Sort downloads
          </label>
          <select
            id="sort-by"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={`${selectClass} w-full`}
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
          Showing {shown.length} of {filtered.length} download{filtered.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-destructive/30 px-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear history
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-panel p-10 text-center">
          <h3 className="text-base font-bold">No matches</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search term or reset the filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              onDownloadAgain={onDownloadAgain}
              onCopyLink={onCopyLink}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {visible < filtered.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="min-h-12 w-full rounded-xl border border-border bg-card text-sm font-semibold text-primary-dark transition-colors hover:bg-secondary"
        >
          Load more
        </button>
      )}

      <ConfirmationModal
        open={confirmOpen}
        title="Clear download history?"
        description="This removes every saved item from this device. Active downloads aren't affected."
        confirmLabel="Clear history"
        onConfirm={() => {
          onClear();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
