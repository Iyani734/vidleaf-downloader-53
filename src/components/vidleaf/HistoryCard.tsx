import { ClipboardCopy, Download, Link2, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HistoryItem } from "@/lib/vidleaf/types";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/vidleaf/format";

interface Props {
  item: HistoryItem;
  onDownloadAgain: (item: HistoryItem) => void;
  onCopyLink: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
}

export function HistoryCard({ item, onDownloadAgain, onCopyLink, onRemove }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <article className="surface-panel flex flex-col gap-4 p-4 transition-shadow hover:shadow-lift sm:flex-row sm:items-center">
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-32">
        <img src={item.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute bottom-1 right-1 rounded bg-foreground/85 px-1.5 py-0.5 text-[10px] font-semibold text-background">
          {formatDuration(item.durationSeconds)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-foreground">{item.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.channel}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-primary-dark">
            {item.qualityLabel}
          </span>
          <span>{item.format}</span>
          <span>{formatBytes(item.sizeBytes)}</span>
          <span>{formatDateTime(item.completedAt)}</span>
          <span>took {formatDuration(item.downloadSeconds)}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onDownloadAgain(item)}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-dark sm:flex-none"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download again
        </button>
        <button
          type="button"
          onClick={() => onCopyLink(item)}
          aria-label={`Copy link for ${item.title}`}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.title} from history`}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${item.title}`}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lift"
            >
              <MenuItem
                onClick={() => {
                  onDownloadAgain(item);
                  setMenuOpen(false);
                }}
                icon={<Download className="h-4 w-4" />}
                label="Download again"
              />
              <MenuItem
                onClick={() => {
                  onCopyLink(item);
                  setMenuOpen(false);
                }}
                icon={<ClipboardCopy className="h-4 w-4" />}
                label="Copy source link"
              />
              <MenuItem
                onClick={() => {
                  onRemove(item.id);
                  setMenuOpen(false);
                }}
                icon={<Trash2 className="h-4 w-4" />}
                label="Remove from history"
                destructive
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function MenuItem({
  onClick,
  icon,
  label,
  destructive = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors " +
        (destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-secondary")
      }
    >
      {icon}
      {label}
    </button>
  );
}
