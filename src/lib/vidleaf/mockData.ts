import type { FileFormat, QualityOption, VideoInfo } from "./types";

/** Mock catalogue used by the simulated analysis service. */

const THUMBS = [
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=960&q=70",
];

interface QualitySpec {
  id: string;
  label: string;
  resolution: string;
  height: number;
  fps?: number;
  format: FileFormat;
  /** approximate megabytes per minute of video */
  mbPerMinute: number;
  kind: "video" | "audio";
}

const QUALITY_SPECS: QualitySpec[] = [
  {
    id: "2160p",
    label: "4K / 2160p",
    resolution: "3840x2160",
    height: 2160,
    fps: 60,
    format: "MP4",
    mbPerMinute: 165,
    kind: "video",
  },
  {
    id: "1440p",
    label: "2K / 1440p",
    resolution: "2560x1440",
    height: 1440,
    fps: 60,
    format: "WebM",
    mbPerMinute: 92,
    kind: "video",
  },
  {
    id: "1080p",
    label: "Full HD / 1080p",
    resolution: "1920x1080",
    height: 1080,
    fps: 60,
    format: "MP4",
    mbPerMinute: 48,
    kind: "video",
  },
  {
    id: "720p",
    label: "HD / 720p",
    resolution: "1280x720",
    height: 720,
    fps: 30,
    format: "MP4",
    mbPerMinute: 26,
    kind: "video",
  },
  {
    id: "480p",
    label: "480p",
    resolution: "854x480",
    height: 480,
    fps: 30,
    format: "MP4",
    mbPerMinute: 14,
    kind: "video",
  },
  {
    id: "360p",
    label: "360p",
    resolution: "640x360",
    height: 360,
    fps: 30,
    format: "WebM",
    mbPerMinute: 8,
    kind: "video",
  },
  {
    id: "240p",
    label: "240p",
    resolution: "426x240",
    height: 240,
    fps: 30,
    format: "MP4",
    mbPerMinute: 5,
    kind: "video",
  },
  {
    id: "144p",
    label: "144p",
    resolution: "256x144",
    height: 144,
    fps: 24,
    format: "MP4",
    mbPerMinute: 2.4,
    kind: "video",
  },
  {
    id: "audio-m4a",
    label: "Audio only — High",
    resolution: "—",
    height: 0,
    format: "M4A",
    mbPerMinute: 1.4,
    kind: "audio",
  },
  {
    id: "audio-mp3",
    label: "Audio only — Standard",
    resolution: "—",
    height: 0,
    format: "MP3",
    mbPerMinute: 0.95,
    kind: "audio",
  },
];

function buildQualities(durationSeconds: number, maxHeight: number): QualityOption[] {
  const minutes = durationSeconds / 60;
  const options: QualityOption[] = QUALITY_SPECS.map((spec) => {
    const base: QualityOption = {
      id: spec.id,
      label: spec.label,
      resolution: spec.resolution,
      height: spec.height,
      format: spec.format,
      kind: spec.kind,
      sizeBytes: Math.round(spec.mbPerMinute * minutes * 1024 * 1024),
      available: spec.kind === "audio" || spec.height <= maxHeight,
    };
    return spec.fps === undefined ? base : { ...base, fps: spec.fps };
  });

  const best = options.find((o) => o.available && o.kind === "video");
  if (best) best.recommended = true;
  return options;
}

interface MockSource {
  title: string;
  channel: string;
  durationSeconds: number;
  views: number;
  uploadedAt: string;
  maxHeight: number;
}

const SOURCES: MockSource[] = [
  {
    title: "Building a Calm Morning Routine in the Mountains",
    channel: "Northwild Studio",
    durationSeconds: 764,
    views: 1_284_930,
    uploadedAt: "2026-05-14T09:20:00.000Z",
    maxHeight: 2160,
  },
  {
    title: "How Modern Web Interfaces Are Designed — Full Walkthrough",
    channel: "Interface Lab",
    durationSeconds: 2145,
    views: 402_118,
    uploadedAt: "2026-03-02T16:45:00.000Z",
    maxHeight: 1440,
  },
  {
    title: "Lo-fi Study Session — 1 Hour of Focus Music",
    channel: "Green Room Audio",
    durationSeconds: 3612,
    views: 9_845_002,
    uploadedAt: "2025-11-21T07:00:00.000Z",
    maxHeight: 1080,
  },
  {
    title: "Coastal Drone Cinematics — Shot on a Foggy Sunrise",
    channel: "Skyline Frames",
    durationSeconds: 421,
    views: 88_412,
    uploadedAt: "2026-06-30T12:10:00.000Z",
    maxHeight: 2160,
  },
  {
    title: "Everything You Need to Know About Video Codecs",
    channel: "Bitrate Weekly",
    durationSeconds: 1188,
    views: 231_770,
    uploadedAt: "2026-01-18T18:30:00.000Z",
    maxHeight: 720,
  },
];

export const EXAMPLE_URL = "https://www.example-video.com/watch?v=vidleaf-demo-01";

/** Deterministically picks a mock video for a given URL. */
export function mockVideoForUrl(url: string): VideoInfo {
  const seed = Array.from(url).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const source = SOURCES[seed % SOURCES.length]!;
  const thumbnail = THUMBS[seed % THUMBS.length]!;

  return {
    id: `vid_${seed}`,
    url,
    title: source.title,
    channel: source.channel,
    thumbnail,
    durationSeconds: source.durationSeconds,
    uploadedAt: source.uploadedAt,
    views: source.views,
    qualities: buildQualities(source.durationSeconds, source.maxHeight),
  };
}

/** Seeded history so first-time visitors see a populated "My Downloads". */
export function seedHistory() {
  const now = Date.now();
  return SOURCES.slice(0, 4).map((s, i) => ({
    id: `hist_seed_${i}`,
    title: s.title,
    channel: s.channel,
    thumbnail: THUMBS[i % THUMBS.length]!,
    url: `${EXAMPLE_URL}&i=${i}`,
    qualityLabel: ["Full HD / 1080p", "HD / 720p", "Audio only — High", "4K / 2160p"][i]!,
    resolution: ["1920x1080", "1280x720", "—", "3840x2160"][i]!,
    format: (["MP4", "MP4", "M4A", "MP4"] as FileFormat[])[i]!,
    kind: (i === 2 ? "audio" : "video") as "video" | "audio",
    sizeBytes: [612, 214, 51, 2380][i]! * 1024 * 1024,
    durationSeconds: s.durationSeconds,
    completedAt: now - (i + 1) * 1000 * 60 * 60 * 9,
    downloadSeconds: [42, 18, 6, 190][i]!,
  }));
}
