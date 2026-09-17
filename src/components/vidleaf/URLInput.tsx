import { AlertCircle, Loader2, Search, X } from "lucide-react";
import { EXAMPLE_URL } from "@/lib/vidleaf/mockData";

interface URLInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
  loading: boolean;
}

export function URLInput({ value, onChange, onSubmit, error, loading }: URLInputProps) {
  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="video-url" className="sr-only">
        Public video link
      </label>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="video-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste a public video link here…"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "url-error" : "url-hint"}
            className="h-12 w-full rounded-xl border border-transparent bg-secondary pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:bg-background focus:outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear link"
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-dark hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Analyzing…
            </>
          ) : (
            "Get Video"
          )}
        </button>
      </div>

      {error ? (
        <p
          id="url-error"
          role="alert"
          className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        <p id="url-hint" className="mt-3 text-sm text-muted-foreground">
          Works with public links.{" "}
          <button
            type="button"
            onClick={() => onChange(EXAMPLE_URL)}
            className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-dark hover:underline"
          >
            Try an example link
          </button>
        </p>
      )}
    </form>
  );
}
