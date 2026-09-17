import { CalendarDays, Clock, Eye, User } from "lucide-react";
import type { VideoInfo } from "@/lib/vidleaf/types";
import { formatDate, formatDuration, formatViews } from "@/lib/vidleaf/format";

export function VideoPreview({ video }: { video: VideoInfo }) {
  const views = formatViews(video.views);

  return (
    <article className="surface-panel overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={video.thumbnail}
          alt={`Thumbnail for ${video.title}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
        />
        <span className="absolute bottom-3 right-3 rounded-lg bg-foreground/85 px-2 py-1 text-xs font-semibold text-background">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <h3 className="text-lg font-bold leading-snug text-foreground">{video.title}</h3>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <User className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Channel</dt>
            <dd className="truncate font-medium text-foreground">{video.channel}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Duration</dt>
            <dd>{formatDuration(video.durationSeconds)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Uploaded</dt>
            <dd>{formatDate(video.uploadedAt)}</dd>
          </div>
          {views && (
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <dt className="sr-only">Views</dt>
              <dd>{views}</dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}

export function VideoPreviewSkeleton() {
  return (
    <div className="surface-panel overflow-hidden" aria-hidden="true">
      <div className="shimmer aspect-video w-full" />
      <div className="space-y-3 p-5">
        <div className="shimmer h-5 w-4/5 rounded-md" />
        <div className="shimmer h-4 w-2/5 rounded-md" />
      </div>
    </div>
  );
}
