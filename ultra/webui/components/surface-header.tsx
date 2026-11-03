import type { ArtifactMeta } from "@/lib/shell/vault";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * The page header for an embedded surface: the title, and one line of derived
 * metadata (size + mtime) read server-side — the only thing read from the file.
 */
export function SurfaceHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: ArtifactMeta;
}) {
  return (
    <header className="shrink-0 border-b border-border px-5 py-4 sm:px-8">
      <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
        {description ? <span>{description}</span> : null}
        {meta?.ok ? (
          <span className="font-mono">
            {formatBytes(meta.size)} · {new Date(meta.mtime).toLocaleString()}
          </span>
        ) : null}
      </div>
    </header>
  );
}
