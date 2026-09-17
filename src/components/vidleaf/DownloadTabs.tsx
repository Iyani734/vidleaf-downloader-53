import { useState } from "react";
import { Activity, History } from "lucide-react";
import type { ActiveDownload, HistoryItem } from "@/lib/vidleaf/types";
import { ActiveDownloadCard } from "./ActiveDownloadCard";
import { DownloadHistory } from "./DownloadHistory";
import { cn } from "@/lib/utils";

interface Props {
  active: ActiveDownload[];
  history: HistoryItem[];
  activeCount: number;
  onTogglePause: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onDownloadAgain: (item: HistoryItem) => void;
  onCopyLink: (item: HistoryItem) => void;
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
}

export function DownloadTabs(props: Props) {
  const [tab, setTab] = useState<"active" | "history">("active");

  return (
    <section id="my-downloads" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            My Downloads
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Track everything in one place
          </h2>
        </header>

        <div
          role="tablist"
          aria-label="Downloads"
          className="mt-6 inline-flex w-full gap-1 rounded-2xl border border-border bg-card p-1 shadow-soft sm:w-auto"
        >
          <TabButton
            id="tab-active"
            controls="panel-active"
            selected={tab === "active"}
            onClick={() => setTab("active")}
            icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            label="Downloading"
            badge={props.activeCount}
          />
          <TabButton
            id="tab-history"
            controls="panel-history"
            selected={tab === "history"}
            onClick={() => setTab("history")}
            icon={<History className="h-4 w-4" aria-hidden="true" />}
            label="Download History"
          />
        </div>

        <div className="mt-6">
          {tab === "active" ? (
            <div id="panel-active" role="tabpanel" aria-labelledby="tab-active" className="space-y-3">
              {props.active.length === 0 ? (
                <div className="surface-panel flex flex-col items-center gap-3 p-12 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
                    <Activity className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-bold">Nothing downloading right now</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Start a download from the box above and live progress shows up here.
                  </p>
                </div>
              ) : (
                props.active.map((item) => (
                  <ActiveDownloadCard
                    key={item.id}
                    item={item}
                    onTogglePause={props.onTogglePause}
                    onCancel={props.onCancel}
                    onRetry={props.onRetry}
                    onDismiss={props.onDismiss}
                  />
                ))
              )}
            </div>
          ) : (
            <div id="panel-history" role="tabpanel" aria-labelledby="tab-history">
              <DownloadHistory
                history={props.history}
                onDownloadAgain={props.onDownloadAgain}
                onCopyLink={props.onCopyLink}
                onRemove={props.onRemoveHistory}
                onClear={props.onClearHistory}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TabButton({
  id,
  controls,
  selected,
  onClick,
  icon,
  label,
  badge,
}: {
  id: string;
  controls: string;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all sm:flex-none",
        selected
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            selected ? "bg-primary-dark text-primary-foreground" : "bg-primary/10 text-primary-dark",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
