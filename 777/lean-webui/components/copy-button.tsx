"use client";

/**
 * copy-button.tsx — copy to the clipboard, and tell the truth about it.
 *
 * The console runs in places where `navigator.clipboard` does not exist: plain
 * http on a LAN address is not a secure context, and a packaged shell may serve
 * from a non-http origin. So a refused copy falls back to the selection-based
 * copy, and if that fails too the button says "Copy failed" — it never claims a
 * copy that did not happen.
 */

import { useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

/**
 * Put `text` on the clipboard, or throw. The caller decides how to say so.
 *
 * The fallback selects a throwaway textarea and runs the legacy copy command —
 * the only route still available outside a secure context. It is called inside
 * a click handler, so the gesture the browser requires is present.
 */
export async function writeClipboard(text: string): Promise<void> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    await clipboard.writeText(text);
    return;
  }
  if (!legacyCopy(text)) {
    throw new Error("the clipboard is not available in this context");
  }
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-2000px";
  area.style.opacity = "0";
  document.body.appendChild(area);

  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  let ok = false;
  try {
    area.select();
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(area);
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
  }
  return ok;
}

/**
 * A button that copies exactly `text` — nothing is composed here, so what lands
 * on the clipboard is what the caller rendered.
 */
export function CopyButton({
  text,
  label = "Copy",
  what = "Text",
  srLabel,
  className = "",
}: {
  /** the exact string placed on the clipboard */
  text: string;
  /** the visible label while idle */
  label?: string;
  /** what the live region says was copied ("The trigger") */
  what?: string;
  /** the accessible name, when the visible label is ambiguous inside a list */
  srLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await writeClipboard(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  const visible = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;

  const tone =
    state === "copied"
      ? "border-accent text-accent"
      : state === "failed"
        ? "border-error text-error"
        : "border-border text-ink-2 hover:border-border-strong hover:text-ink";

  return (
    <span className={"inline-flex shrink-0 items-center " + className}>
      <button
        type="button"
        onClick={copy}
        aria-label={srLabel}
        title={
          state === "failed"
            ? "The clipboard is unavailable here — select the text and copy it"
            : undefined
        }
        className={
          "mono rounded-md border bg-surface px-2.5 py-1 text-[11px] uppercase tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
          tone
        }
      >
        {visible}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied"
          ? what + " copied to the clipboard"
          : state === "failed"
            ? "Copy failed — select the text and copy it"
            : ""}
      </span>
    </span>
  );
}
