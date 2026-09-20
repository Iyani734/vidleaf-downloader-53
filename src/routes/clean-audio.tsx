import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AudioLines, Download, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/vidleaf/SiteHeader";
import { Footer } from "@/components/vidleaf/Footer";
import { AudioDropzone } from "@/components/audio/AudioDropzone";
import { EnhancementPicker } from "@/components/audio/EnhancementPicker";
import { CleanupJobCard } from "@/components/audio/CleanupJobCard";
import { useAudioCleanup } from "@/hooks/useAudioCleanup";
import type { AudioOutputFormat } from "@/lib/vidleaf/audioService";
import { formatBytes, relativeTime } from "@/lib/vidleaf/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clean-audio")({
  head: () => ({
    meta: [
      { title: "Audio Cleanup — VidLeaf" },
      {
        name: "description",
        content:
          "Upload a recording and remove background noise, echo, wind, clipping, long silences and more. Studio-clean audio in a single pass.",
      },
      { property: "og:title", content: "Audio Cleanup — VidLeaf" },
      {
        property: "og:description",
        content: "Remove noise, echo, wind and dead air from any recording — pick your fixes and download clean audio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CleanAudioPage,
});

const FORMAT_LABELS: Record<string, string> = {
  mp3: "MP3 · smallest, plays everywhere",
  m4a: "M4A · great quality per megabyte",
  wav: "WAV · lossless, best for editing",
};

function CleanAudioPage() {
  const cleanup = useAudioCleanup();
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<string[]>(["remove_noise"]);
  const [format, setFormat] = useState<AudioOutputFormat>("mp3");
  const [submitting, setSubmitting] = useState(false);

  const options = cleanup.catalog?.enhancements ?? [];
  const maxBytes = cleanup.catalog?.maxUploadBytes ?? 512 * 1024 * 1024;
  const formats = (cleanup.catalog?.outputFormats ?? ["mp3", "m4a", "wav"]) as AudioOutputFormat[];

  const hasProcessing = useMemo(
    () => selected.some((id) => !options.find((option) => option.id === id)?.modifier),
    [selected, options],
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));

  const submit = async () => {
    if (!file || !hasProcessing) return;
    setSubmitting(true);
    try {
      await cleanup.startCleanup({ file, enhancements: selected, outputFormat: format });
      toast.success("Cleanup started", { description: file.name });
      setFile(null);
      document.getElementById("my-cleanups")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That cleanup could not be started.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="top" className="min-h-dvh bg-background">
      <SiteHeader
        ctaHref="#cleaner"
        ctaLabel="Clean a file"
        sectionLinks={[
          { href: "#cleaner", label: "Cleaner" },
          { href: "#my-cleanups", label: "My Cleanups", badge: cleanup.activeCount },
        ]}
      />

      <main>
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-dark">
              <AudioLines className="h-3.5 w-3.5" aria-hidden="true" />
              Audio cleanup
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Make any recording sound <span className="text-primary">studio clean</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Upload a voice note, interview, podcast or video, choose exactly what to fix, and get a polished file back.
            </p>
          </div>
        </section>

        <section id="cleaner" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-12 sm:px-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <AudioDropzone file={file} onSelect={setFile} maxBytes={maxBytes} disabled={submitting} />

            <div className="mt-8">
              {cleanup.catalogError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
                  {cleanup.catalogError}
                </p>
              ) : options.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading cleanup options…
                </p>
              ) : (
                <EnhancementPicker options={options} selected={selected} onToggle={toggle} disabled={submitting} />
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Output format</h3>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {formats.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    aria-pressed={format === value}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      format === value
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border bg-secondary/40 hover:border-primary/40",
                    )}
                  >
                    <span className="block text-sm font-extrabold uppercase text-foreground">{value}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {FORMAT_LABELS[value] ?? "Cleaned audio"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!file || !hasProcessing || submitting}
              className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-dark hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {submitting ? "Uploading…" : "Enhance audio"}
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </button>
            {!hasProcessing && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Choose at least one fix — “Keep music” only softens the other fixes.
              </p>
            )}
          </div>
        </section>

        <section id="my-cleanups" className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-20 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight">My cleanups</h2>

          {cleanup.jobs.length === 0 && cleanup.history.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
              Nothing here yet. Upload a recording above and your cleaned files will appear here.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {cleanup.jobs.map((job) => (
                <CleanupJobCard
                  key={job.id}
                  job={job}
                  onCancel={(id) => void cleanup.cancelCleanup(id)}
                  onDismiss={cleanup.dismissJob}
                />
              ))}
            </div>
          )}

          {cleanup.history.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent files</h3>
                <button
                  type="button"
                  onClick={() => {
                    cleanup.clearHistory();
                    toast("History cleared");
                  }}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-destructive"
                >
                  Clear all
                </button>
              </div>
              <ul className="mt-3 grid gap-2">
                {cleanup.history.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{item.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.outputFormat.toUpperCase()}
                        {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""} · {relativeTime(item.completedAt)}
                      </p>
                    </div>
                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-border transition-colors hover:bg-secondary"
                        aria-label={`Download ${item.filename}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => cleanup.removeHistoryItem(item.id)}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-border transition-colors hover:bg-secondary hover:text-destructive"
                      aria-label={`Remove ${item.filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
