import type { StageState } from "@/lib/types";

/** The strip's state mark — the spec §5 vocabulary (✓ done · ● current · ○ upcoming). */
export function stageGlyph(state: StageState): string {
  switch (state) {
    case "done":
      return "✓";
    case "current":
      return "●";
    case "blocked":
      return "✕";
    case "skipped":
      return "○";
  }
}

export function stateTextClass(state: StageState): string {
  switch (state) {
    case "done":
      return "text-accent";
    case "current":
      return "text-accent";
    case "blocked":
      return "text-error";
    case "skipped":
      return "text-muted";
  }
}
