import { useState } from "react";
import {
  Copy,
  Download,
  Film,
  MoreVertical,
  Music4,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatDateTime,
  formatDuration,
  formatElapsed,
  formatSize,
} from "@/lib/vidleaf/format";
import type { HistoryItem } from "@/lib/vidleaf/types";

interface Props {
  item: HistoryItem;
  onDownloadAgain: (item: HistoryItem) => void;
  onCopyLink: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
}

export function HistoryCard({ item, onDownloadAgain, onCopyLink, onRemove }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = item.kind === "audio" ? Music4 : Film;

  return (
    <li className="surface-card p-4 transition-shadow duration-200 hover:shadow-lift">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-secondary sm:w-40">
          <img
            src={item.thumbnail}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="size-full object-cover"
          />
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-foreground/80 px-1.5 py-0.5 text-[11px] font-semibold text-background">
            {formatDuration(item.durationSeconds)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-bold text-foreground sm:text-base">
                {item.title}
              </h3>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.channel}</p>
            </div>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-xl"
                  aria-label={`More actions for ${item.title}`}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onSelect={() => onDownloadAgain(item)}>
                  <Download className="size-4" aria-hidden="true" /> Download again
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onCopyLink(item)}>
                  <Copy className="size-4" aria-hidden="true" /> Copy link
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onRemove(item)}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
            <li className="inline-flex items-center gap-1.5 font-medium text-primary-dark">
              <Icon className="size-3.5" aria-hidden="true" />
              {item.qualityLabel}
            </li>
            <li>{item.format}</li>
            <li>{formatSize(item.sizeMB)}</li>
            <li>{formatDateTime(item.completedAt)}</li>
            <li>Took {formatElapsed(item.downloadSeconds)}</li>
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-10 flex-1 rounded-xl sm:flex-none"
              onClick={() => onDownloadAgain(item)}
            >
              <Download className="size-4" aria-hidden="true" /> Download again
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-10 flex-1 rounded-xl sm:flex-none"
              onClick={() => onCopyLink(item)}
            >
              <Copy className="size-4" aria-hidden="true" /> Copy link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-10 flex-1 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
              onClick={() => onRemove(item)}
            >
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
