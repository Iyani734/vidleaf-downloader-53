import { CalendarDays, Clock, Eye, PlayCircle, User } from "lucide-react";
import { formatDate, formatDuration, formatViews } from "@/lib/vidleaf/format";
import type { VideoInfo } from "@/lib/vidleaf/types";

export function VideoPreview({ video }: { video: VideoInfo }) {
  const views = formatViews(video.views);

  return (
    <article className="surface-card overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-secondary">
        <img
          src={video.thumbnail}
          alt={`Thumbnail for ${video.title}`}
          loading="lazy"
          className="size-full object-cover"
        />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-foreground/80 px-2 py-1 text-xs font-semibold text-background">
          <Clock className="size-3.5" aria-hidden="true" />
          {formatDuration(video.durationSeconds)}
        </span>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-background/90 px-2.5 py-1 text-xs font-semibold text-primary-dark">
          <PlayCircle className="size-3.5" aria-hidden="true" />
          Video found
        </span>
      </div>

      <div className="space-y-3 p-5">
        <h3 className="text-lg font-bold leading-snug text-foreground">{video.title}</h3>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <User className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Channel</dt>
            <dd className="truncate font-medium text-foreground">{video.channel}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Uploaded</dt>
            <dd>{formatDate(video.uploadedAt)}</dd>
          </div>
          {views && (
            <div className="flex items-center gap-1.5">
              <Eye className="size-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Views</dt>
              <dd>{views}</dd>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Duration</dt>
            <dd>{formatDuration(video.durationSeconds)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
