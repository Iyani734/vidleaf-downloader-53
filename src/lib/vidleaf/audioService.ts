import { AnalysisError, type BackendDownloadJob } from "./service";

const API_PREFIX = "/api/v1";
const API_BASE = (import.meta.env["VITE_VIDLEAF_API_URL"] ?? "").replace(/\/+$/, "");

export interface EnhancementOption {
  id: string;
  label: string;
  description: string;
  group: string;
  modifier: boolean;
}

export interface EnhancementCatalog {
  enhancements: EnhancementOption[];
  outputFormats: string[];
  maxUploadBytes: number;
}

export type AudioOutputFormat = "mp3" | "m4a" | "wav";

async function readError(response: Response): Promise<AnalysisError> {
  let code: string | undefined;
  let message: string | undefined;
  try {
    const payload = (await response.json()) as { error?: { code?: string; message?: string } };
    code = payload.error?.code;
    message = payload.error?.message;
  } catch {
    // Keep a readable message when the backend is unreachable.
  }
  return new AnalysisError(message || "VidLeaf could not clean that file. Make sure the backend is running.", {
    code,
    status: response.status,
  });
}

export const audioService = {
  async loadCatalog(): Promise<EnhancementCatalog> {
    const response = await fetch(`${API_BASE}${API_PREFIX}/audio/enhancements`, { credentials: "include" });
    if (!response.ok) throw await readError(response);
    return (await response.json()) as EnhancementCatalog;
  },

  async createCleanupJob(input: {
    file: File;
    enhancements: string[];
    outputFormat: AudioOutputFormat;
    bitrateKbps?: number;
  }): Promise<BackendDownloadJob> {
    const body = new FormData();
    body.append("file", input.file);
    body.append("enhancements", input.enhancements.join(","));
    body.append("outputFormat", input.outputFormat);
    body.append("bitrateKbps", String(input.bitrateKbps ?? 192));

    const response = await fetch(`${API_BASE}${API_PREFIX}/audio/jobs`, {
      method: "POST",
      credentials: "include",
      body,
    });
    if (!response.ok) throw await readError(response);
    return (await response.json()) as BackendDownloadJob;
  },
};
