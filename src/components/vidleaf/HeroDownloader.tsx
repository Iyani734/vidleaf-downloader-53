import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { URLInput } from "./URLInput";
import { VideoPreview, VideoPreviewSkeleton } from "./VideoPreview";
import { QualitySelector } from "./QualitySelector";
import { DownloadSummary } from "./DownloadSummary";
import { AnalysisError, vidleafService } from "@/lib/vidleaf/service";
import { isValidUrl } from "@/lib/vidleaf/format";
import type { QualityOption, VideoInfo } from "@/lib/vidleaf/types";

type Phase = "idle" | "analyzing" | "found" | "error";

interface Props {
  onStartDownload: (video: VideoInfo, quality: QualityOption, speedMbps: number) => Promise<void>;
  presetUrl?: string | undefined;
}

export function HeroDownloader({ onStartDownload, presetUrl }: Props) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [speedMbps, setSpeedMbps] = useState(20);
  const [customSpeed, setCustomSpeed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (presetUrl) setUrl(presetUrl);
  }, [presetUrl]);

  const selected = useMemo(
    () => video?.qualities.find((q) => q.id === selectedId) ?? null,
    [video, selectedId],
  );

  async function analyze() {
    if (!isValidUrl(url)) {
      setError("That doesn't look like a valid link. Paste a full public video URL.");
      setPhase("error");
      return;
    }
    setError(null);
    setPhase("analyzing");
    setVideo(null);
    try {
      const info = await vidleafService.analyzeVideo(url);
      setVideo(info);
      const recommended = info.qualities.find((q) => q.recommended) ?? null;
      setSelectedId(recommended ? recommended.id : null);
      setPhase("found");
    } catch (err) {
      setError(
        err instanceof AnalysisError ? err.message : "We couldn't analyze that link. Try again.",
      );
      setPhase("error");
    }
  }

  async function handleDownload() {
    if (!video || !selected) return;
    setStarting(true);
    try {
      await onStartDownload(video, selected, speedMbps);
    } catch (err) {
      setError(
        err instanceof AnalysisError ? err.message : "We couldn't start that download. Try again.",
      );
      setPhase("error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <section id="downloader" className="relative scroll-mt-24 overflow-hidden bg-secondary/60">
      <div
        className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary-dark shadow-soft">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Ad-free · No sign-up
          </span>
          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            Download Videos in the Quality You Want
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Paste a public video link, choose your preferred quality, and download it in just a few
            steps.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl">
          <URLInput
            value={url}
            onChange={(v) => {
              setUrl(v);
              if (phase === "error") {
                setPhase("idle");
                setError(null);
              }
            }}
            onSubmit={analyze}
            error={phase === "error" ? error : null}
            loading={phase === "analyzing"}
          />

          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" /> Instant link analysis
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> History stays on
              your device
            </li>
          </ul>
        </div>

        <p className="sr-only" aria-live="polite">
          {phase === "analyzing"
            ? "Analyzing the link"
            : phase === "found"
              ? "Video found. Choose a quality."
              : ""}
        </p>

        <div className="mx-auto mt-10 max-w-5xl">
          {phase === "analyzing" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <VideoPreviewSkeleton />
              <div className="surface-panel space-y-3 p-5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="shimmer h-14 rounded-xl" />
                ))}
              </div>
            </div>
          )}

          {phase === "found" && video && (
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className="space-y-4">
                <VideoPreview video={video} />
                {selected && (
                  <div className="hidden lg:block">
                    <DownloadSummary
                      quality={selected}
                      speedMbps={speedMbps}
                      customSpeed={customSpeed}
                      onSpeedChange={(mbps, custom) => {
                        setSpeedMbps(mbps);
                        setCustomSpeed(custom);
                      }}
                      onDownload={handleDownload}
                      starting={starting}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <QualitySelector
                  qualities={video.qualities}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                {selected && (
                  <div className="lg:hidden">
                    <DownloadSummary
                      quality={selected}
                      speedMbps={speedMbps}
                      customSpeed={customSpeed}
                      onSpeedChange={(mbps, custom) => {
                        setSpeedMbps(mbps);
                        setCustomSpeed(custom);
                      }}
                      onDownload={handleDownload}
                      starting={starting}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
