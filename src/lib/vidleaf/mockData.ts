import type { HistoryItem, QualityOption, SpeedPreset, VideoInfo } from "./types";

// ---------------------------------------------------------------------------
// Mock data only. Replace with real API payloads when a backend is connected.
// ---------------------------------------------------------------------------

export const SPEED_PRESETS: SpeedPreset[] = [
  { id: "slow", label: "Slow — 5 Mbps", mbps: 5 },
  { id: "average", label: "Average — 20 Mbps", mbps: 20 },
  { id: "fast", label: "Fast — 50 Mbps", mbps: 50 },
  { id: "veryfast", label: "Very fast — 100 Mbps", mbps: 100 },
  { id: "custom", label: "Custom speed", mbps: 25 },
];

export const EXAMPLE_URL = "https://www.youtube.com/watch?v=vidleaf-demo-01";

const THUMBS = [
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=960&q=70",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=960&q=70",
];

function buildQualities(durationSeconds: number, seed: number): QualityOption[] {
  const minutes = durationSeconds / 60;
  const mk = (
    id: string,
    label: string,
    resolution: string,
    height: number,
    mbPerMin: number,
    format: QualityOption["format"],
    fps?: number,
    available = true,
  ): QualityOption => ({
    id,
    label,
    resolution,
    height,
    kind: "video",
    format,
    fps,
    sizeMB: Math.max(1, Math.round(minutes * mbPerMin * (0.9 + (seed % 5) / 20) * 10) / 10),
    available,
  });

  return [
    {
      id: "best",
      label: "Best Quality",
      resolution: "Auto (up to 2160p)",
      height: 2160,
      kind: "video",
      format: "MP4",
      fps: 60,
      sizeMB: Math.round(minutes * 92 * 10) / 10,
      available: true,
      recommended: true,
    },
    mk("2160", "4K / 2160p", "3840x2160", 2160, 92, "MP4", 60, seed % 3 !== 0),
    mk("1440", "2K / 1440p", "2560x1440", 1440, 52, "WebM", 60),
    mk("1080", "Full HD / 1080p", "1920x1080", 1080, 26, "MP4", 60),
    mk("720", "HD / 720p", "1280x720", 720, 14, "MP4", 30),
    mk("480", "480p", "854x480", 480, 8, "MP4", 30),
    mk("360", "360p", "640x360", 360, 5, "WebM", 30),
    mk("240", "240p", "426x240", 240, 3, "MP4", 30),
    mk("144", "144p", "256x144", 144, 1.6, "MP4", 15),
    {
      id: "audio-m4a",
      label: "Audio only — High",
      resolution: "Audio · 192 kbps",
      height: 0,
      kind: "audio",
      format: "M4A",
      sizeMB: Math.round(minutes * 1.45 * 10) / 10,
      available: true,
      bitrateKbps: 192,
    },
    {
      id: "audio-mp3",
      label: "Audio only — Standard",
      resolution: "Audio · 128 kbps",
      height: 0,
      kind: "audio",
      format: "MP3",
      sizeMB: Math.round(minutes * 0.96 * 10) / 10,
      available: true,
      bitrateKbps: 128,
    },
  ];
}

const MOCK_VIDEOS: Omit<VideoInfo, "url" | "qualities">[] = [
  {
    id: "vl-1",
    title: "Sunrise Over the Northern Fjords — 4K Nature Film",
    channel: "Wildframe Studio",
    thumbnail: THUMBS[0]!,
    durationSeconds: 12 * 60 + 42,
    uploadedAt: "2026-05-14T09:12:00.000Z",
    views: 2_418_903,
  },
  {
    id: "vl-2",
    title: "Building a Design System from Scratch (Full Workshop)",
    channel: "Interface Lab",
    thumbnail: THUMBS[1]!,
    durationSeconds: 48 * 60 + 5,
    uploadedAt: "2026-03-02T16:40:00.000Z",
    views: 512_774,
  },
  {
    id: "vl-3",
    title: "Deep Focus — Ambient Study Session",
    channel: "Quiet Hours",
    thumbnail: THUMBS[2]!,
    durationSeconds: 62 * 60,
    uploadedAt: "2026-01-21T07:00:00.000Z",
    views: 8_042_115,
  },
  {
    id: "vl-4",
    title: "Street Food Tour: 12 Stops in One Evening",
    channel: "Latitude Eats",
    thumbnail: THUMBS[3]!,
    durationSeconds: 21 * 60 + 18,
    uploadedAt: "2026-06-08T18:25:00.000Z",
    views: 1_106_002,
  },
];

export function pickMockVideo(url: string): VideoInfo {
  let seed = 0;
  for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) % 100000;
  const base = MOCK_VIDEOS[seed % MOCK_VIDEOS.length]!;
  return {
    ...base,
    url,
    qualities: buildQualities(base.durationSeconds, seed),
  };
}

export const SEED_HISTORY: HistoryItem[] = [
  {
    id: "h-1",
    title: "Sunrise Over the Northern Fjords — 4K Nature Film",
    channel: "Wildframe Studio",
    thumbnail: THUMBS[0]!,
    url: "https://www.youtube.com/watch?v=vidleaf-demo-01",
    qualityLabel: "4K / 2160p",
    resolution: "3840x2160",
    height: 2160,
    format: "MP4",
    kind: "video",
    sizeMB: 1168.4,
    durationSeconds: 762,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    downloadSeconds: 214,
  },
  {
    id: "h-2",
    title: "Deep Focus — Ambient Study Session",
    channel: "Quiet Hours",
    thumbnail: THUMBS[2]!,
    url: "https://www.youtube.com/watch?v=vidleaf-demo-03",
    qualityLabel: "Audio only — High",
    resolution: "Audio · 192 kbps",
    height: 0,
    format: "M4A",
    kind: "audio",
    sizeMB: 89.9,
    durationSeconds: 3720,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    downloadSeconds: 36,
  },
  {
    id: "h-3",
    title: "Building a Design System from Scratch (Full Workshop)",
    channel: "Interface Lab",
    thumbnail: THUMBS[1]!,
    url: "https://www.youtube.com/watch?v=vidleaf-demo-02",
    qualityLabel: "Full HD / 1080p",
    resolution: "1920x1080",
    height: 1080,
    format: "MP4",
    kind: "video",
    sizeMB: 1248.9,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 74).toISOString(),
    durationSeconds: 2885,
    downloadSeconds: 402,
  },
  {
    id: "h-4",
    title: "Street Food Tour: 12 Stops in One Evening",
    channel: "Latitude Eats",
    thumbnail: THUMBS[3]!,
    url: "https://www.youtube.com/watch?v=vidleaf-demo-04",
    qualityLabel: "HD / 720p",
    resolution: "1280x720",
    height: 720,
    format: "MP4",
    kind: "video",
    sizeMB: 298.2,
    durationSeconds: 1278,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    downloadSeconds: 96,
  },
  {
    id: "h-5",
    title: "Golden Hour Timelapse Collection",
    channel: "Wildframe Studio",
    thumbnail: THUMBS[4]!,
    url: "https://www.youtube.com/watch?v=vidleaf-demo-05",
    qualityLabel: "2K / 1440p",
    resolution: "2560x1440",
    height: 1440,
    format: "WebM",
    kind: "video",
    sizeMB: 620.5,
    durationSeconds: 704,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
    downloadSeconds: 141,
  },
  {
    id: "h-6",
    title: "Late Night Lo-Fi Set",
    channel: "Quiet Hours",
    thumbnail: THUMBS[5]!,
    url: "https://www.youtube.com/watch?v=vidleaf-demo-06",
    qualityLabel: "Audio only — Standard",
    resolution: "Audio · 128 kbps",
    height: 0,
    format: "MP3",
    kind: "audio",
    sizeMB: 54.1,
    durationSeconds: 2700,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 320).toISOString(),
    downloadSeconds: 22,
  },
  {
    id: "h-7",
    title: "Coastal Drone Reel — Behind the Scenes",
    channel: "Wildframe Studio",
    thumbnail: THUMBS[3]!,
    url: "https://www.youtube.com/watch?v=vidleaf-demo-07",
    qualityLabel: "480p",
    resolution: "854x480",
    height: 480,
    format: "MP4",
    kind: "video",
    sizeMB: 88.7,
    durationSeconds: 640,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 480).toISOString(),
    downloadSeconds: 31,
  },
];
