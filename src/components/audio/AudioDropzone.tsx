import { useRef, useState } from "react";
import { FileAudio, UploadCloud, X } from "lucide-react";
import { formatBytes } from "@/lib/vidleaf/format";
import { cn } from "@/lib/utils";

interface Props {
  file: File | null;
  onSelect: (file: File | null) => void;
  maxBytes: number;
  disabled?: boolean;
}

export function AudioDropzone({ file, onSelect, maxBytes, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > maxBytes) {
      setError(`That file is ${formatBytes(picked.size)}. The limit is ${formatBytes(maxBytes)}.`);
      return;
    }
    setError(null);
    onSelect(picked);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-dark">
          <FileAudio className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          disabled={disabled}
          aria-label="Remove selected file"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-background transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-secondary/40 hover:border-primary/50",
        )}
      >
        <UploadCloud className="h-8 w-8 text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Drop an audio or video file here</p>
        <p className="text-xs text-muted-foreground">
          MP3, WAV, M4A, AAC, OGG, FLAC or a video file · up to {formatBytes(maxBytes)}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
