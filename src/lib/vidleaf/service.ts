import { pickMockVideo, SEED_HISTORY } from "./mockData";
import type { HistoryItem, VideoInfo } from "./types";

/**
 * VidLeaf service layer.
 *
 * Everything here is simulated in the browser. Each function marks the exact
 * place where a real HTTP endpoint should be wired in later:
 *
 *   analyzeVideo   -> POST /api/analyze        { url } -> VideoInfo
 *   createDownload -> POST /api/downloads      { url, qualityId } -> { jobId }
 *   downloadProgress -> GET  /api/downloads/:id/progress (SSE or polling)
 *   fetchHistory / persistHistory -> GET|PUT /api/history (currently localStorage)
 */

const HISTORY_KEY = "vidleaf.history.v1";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class AnalysisError extends Error {
  code: "no-formats" | "unreachable";
  constructor(code: "no-formats" | "unreachable", message: string) {
    super(message);
    this.code = code;
  }
}

/** TODO: replace with `fetch("/api/analyze", { method: "POST", body: ... })`. */
export async function analyzeVideo(url: string): Promise<VideoInfo> {
  await delay(1400 + Math.random() * 900);
  if (/no-?formats/i.test(url)) {
    throw new AnalysisError(
      "no-formats",
      "No downloadable formats were found for this link.",
    );
  }
  if (/private|unreachable/i.test(url)) {
    throw new AnalysisError(
      "unreachable",
      "This video is private or unavailable. Try another public link.",
    );
  }
  return pickMockVideo(url);
}

/** TODO: replace with `POST /api/downloads` returning a real job id. */
export async function createDownloadJob(
  videoId: string,
  qualityId: string,
): Promise<{ jobId: string }> {
  await delay(400);
  return { jobId: `${videoId}-${qualityId}-${Date.now().toString(36)}` };
}

/** TODO: replace with `GET /api/history`. */
export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(SEED_HISTORY));
      return SEED_HISTORY;
    }
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** TODO: replace with `PUT /api/history`. */
export function saveHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked — history stays in memory for this session */
  }
}
