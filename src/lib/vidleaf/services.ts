import { AudioLines, Download, type LucideIcon } from "lucide-react";

export interface PlatformService {
  id: string;
  name: string;
  tagline: string;
  description: string;
  to: "/download" | "/clean-audio";
  icon: LucideIcon;
  available: boolean;
}

export const PLATFORM_SERVICES: PlatformService[] = [
  {
    id: "downloader",
    name: "Video Downloader",
    tagline: "Save any public video",
    description:
      "Paste a link, pick the quality from 4K down to audio only, and track progress while VidLeaf prepares the file.",
    to: "/download",
    icon: Download,
    available: true,
  },
  {
    id: "audio-cleanup",
    name: "Audio Cleanup",
    tagline: "Studio-clean your recordings",
    description:
      "Upload a recording and remove noise, echo, wind, clipping, dead air and more — combine as many fixes as you need.",
    to: "/clean-audio",
    icon: AudioLines,
    available: true,
  },
];
