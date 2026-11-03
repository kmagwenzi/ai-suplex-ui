"use client";

import { useState } from "react";

/** Copy an absolute path to the clipboard — the thin-host hand-off beside the editor link. */
export function CopyPathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(path);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — leave the button inert */
        }
      }}
      className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
    >
      {copied ? "copied" : "copy path"}
    </button>
  );
}
