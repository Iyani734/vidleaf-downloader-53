import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, TriangleAlert, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { URLInput } from "./URLInput";
import { VideoPreview } from "./VideoPreview";
import { QualitySelector } from "./QualitySelector";
import { DownloadSummary } from "./DownloadSummary";
import { SPEED_PRESETS } from "@/lib/vidleaf/mockData";
import { analyzeVideo, AnalysisError, createDownloadJob } from "@/lib/vidleaf/service";
import { validateVideoUrl } from "@/lib/vidleaf/format";
import { useDownloads } from "@/lib/vidleaf/store";
import type { SpeedPresetId, VideoInfo } from "@/lib/vidleaf/types";

type Phase = "idle" | "analyzing" | "found" | "error";

export function HeroDownloader() {
  const { startDownload } = useDownloads();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [qualityId, setQualityId] = useState("best");
  const [presetId, setPresetId] = useState<SpeedPresetId>("average");
  const [customMbps, setCustomMbps] = useState(25);
  const [starting, setStarting] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const speedMbps =
    presetId === "custom"
      ? customMbps
      : (SPEED_PRESETS.find((p) => p.id === presetId)?.mbps ?? 20);

  const selectedQuality = useMemo(
    () => video?.qualities.find((q) => q.id === qualityId) ?? video?.qualities[0] ?? null,
    [video, qualityId],
  );

  async function handleAnalyze() {
    const check = validateVideoUrl(url);
    if (!check.valid) {
      setError(check.message ?? "Enter a valid link.");
      setPhase("error");
      return;
    }
    if (offline) {
      setError("You appear to be offline. Reconnect and try again.");
      setPhase("error");
      return;
    }
    setError(null);
    setPhase("analyzing");
    setVideo(null);
    try {
      // TODO: swap for POST /api/analyze
      const result = await analyzeVideo(url);
      setVideo(result);
      setQualityId(result.qualities.find((q) => q.recommended)?.id ?? result.qualities[0]?.id ?? "");
      setPhase("found");
    } catch (err) {
      const message =
        err instanceof AnalysisError ? err.message : "We couldn't analyze that link. Try again.";
      setError(message);
      setPhase("error");
    }
  }

  async function handleDownload() {
    if (!video || !selectedQuality) return;
    setStarting(true);
    // TODO: swap for POST /api/downloads
    await createDownloadJob(video.id, selectedQuality.id);
    startDownload(video, selectedQuality, speedMbps);
    setStarting(false);
    toast.success("Download started", { description: selectedQuality.label });
    document.getElementById("my-downloads")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const availableQualities = video?.qualities ?? [];

  return (
    <section id="downloader" className="scroll-mt-24 bg-primary-soft/60 pb-16 pt-12 sm:pb-24 sm:pt-20">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary-dark shadow-soft">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Ad-free · No sign-up · Works on mobile
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
            Download Videos in the{" "}
            <span className="leaf-gradient-text">Quality You Want</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Paste a public video link, choose your preferred quality, and download it in just a few
            steps.
          </p>
        </div>

        {offline && (
          <div
            role="status"
            className="mx-auto mt-6 flex max-w-2xl items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            You're offline. Downloads and link analysis are paused until you reconnect.
          </div>
        )}

        <div className="mt-8">
          <URLInput
            value={url}
            onChange={(v) => {
              setUrl(v);
              if (phase === "error") {
                setError(null);
                setPhase("idle");
              }
            }}
            onSubmit={handleAnalyze}
            error={phase === "error" ? error : null}
            loading={phase === "analyzing"}
          />
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {phase === "analyzing"
            ? "Analyzing the video link"
            : phase === "found"
              ? "Video found. Choose a quality."
              : phase === "error"
                ? (error ?? "Something went wrong")
                : ""}
        </p>

        {phase === "analyzing" && (
          <div className="surface-card mt-8 flex items-center gap-4 p-5">
            <Loader2 className="size-6 shrink-0 animate-spin text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold text-foreground">Analyzing link…</p>
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-secondary" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-secondary" />
            </div>
          </div>
        )}

        {phase === "error" && error && (
          <div
            role="alert"
            className="surface-card mt-8 flex items-start gap-3 border-destructive/30 p-5"
          >
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">We couldn't use that link</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {phase === "found" && video && (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <VideoPreview video={video} />
              {selectedQuality && (
                <div className="hidden lg:block">
                  <DownloadSummary
                    quality={selectedQuality}
                    presetId={presetId}
                    customMbps={customMbps}
                    speedMbps={speedMbps}
                    onPresetChange={setPresetId}
                    onCustomChange={setCustomMbps}
                    onDownload={handleDownload}
                    busy={starting}
                  />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <QualitySelector
                options={availableQualities}
                selectedId={qualityId}
                onSelect={setQualityId}
              />
              {selectedQuality && (
                <div className="lg:hidden">
                  <DownloadSummary
                    quality={selectedQuality}
                    presetId={presetId}
                    customMbps={customMbps}
                    speedMbps={speedMbps}
                    onPresetChange={setPresetId}
                    onCustomChange={setCustomMbps}
                    onDownload={handleDownload}
                    busy={starting}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
