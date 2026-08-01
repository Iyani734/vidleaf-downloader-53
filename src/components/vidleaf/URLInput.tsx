import { Link2, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXAMPLE_URL } from "@/lib/vidleaf/mockData";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
  loading: boolean;
}

export function URLInput({ value, onChange, onSubmit, error, loading }: Props) {
  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <label htmlFor="video-url" className="sr-only">
        Public video link
      </label>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-lift sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Link2
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="video-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste a public video link here…"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "video-url-error" : "video-url-hint"}
            className="h-12 w-full min-w-0 rounded-xl bg-transparent pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear link"
              className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl px-7 text-base font-semibold shadow-soft transition-transform hover:-translate-y-0.5 sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Analyzing…
            </>
          ) : (
            <>
              <Search className="size-5" aria-hidden="true" /> Get Video
            </>
          )}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p
            id="video-url-error"
            role="alert"
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : (
          <p id="video-url-hint" className="text-sm text-muted-foreground">
            Works with public links. Nothing is uploaded anywhere.
          </p>
        )}
        <button
          type="button"
          onClick={() => onChange(EXAMPLE_URL)}
          className="self-start rounded-lg text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-dark hover:underline"
        >
          Try an example link
        </button>
      </div>
    </form>
  );
}
