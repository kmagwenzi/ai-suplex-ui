"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/components/panel";
import {
  SOURCE_LABEL,
  baseTemplate,
  composeCommand,
  isSourceType,
  type SourceType,
} from "@/lib/shell/compose";
import type { CommandDef } from "@/lib/shell/commands";
import type { Tier } from "@/lib/shell/surfaces";

interface Fields {
  command: string | null;
  sourceType: SourceType | null;
  sourceValue: string;
  additional: string;
}

const EMPTY: Fields = { command: null, sourceType: null, sourceValue: "", additional: "" };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The ⌘K command bar. It renders a COMMAND to copy — never a reply to read.
 * The model maps fields (server-side); this component composes with the same
 * shared composer as the API path, so both callers own zero bytes of their own.
 */
export function CommandBar({ tier, commands }: { tier: Tier; commands: CommandDef[] }) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState("");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [mode, setMode] = useState<"ai" | "deterministic" | "manual" | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const composed = useMemo(
    () =>
      fields.command
        ? composeCommand(
            baseTemplate(fields.command),
            { type: fields.sourceType, value: fields.sourceValue },
            fields.additional,
          )
        : null,
    [fields],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (tier === "free") dialogRef.current?.focus();
    else inputRef.current?.focus();
  }, [open, tier]);

  useEffect(() => {
    if (wasOpen.current && !open) {
      setCopied(false);
      triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  async function submit() {
    const trimmed = intent.trim();
    if (trimmed.length === 0 || pending) return;
    setPending(true);
    setError(null);
    setWhy(null);
    setMode(null);
    try {
      const response = await fetch("/api/command-bar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: trimmed }),
      });
      if (!response.ok) {
        // F5: the block must never present a previous mapping as this intent's answer.
        setFields(EMPTY);
        setError(`POST /api/command-bar → HTTP ${response.status}`);
        return;
      }
      const result = await response.json();
      setFields({
        command: typeof result.command === "string" ? result.command : null,
        sourceType: isSourceType(result.sourceType) ? result.sourceType : null,
        sourceValue: typeof result.sourceValue === "string" ? result.sourceValue : "",
        additional: typeof result.additional === "string" ? result.additional : "",
      });
      setMode(result.mode === "ai" ? "ai" : "deterministic");
      setWhy(typeof result.why === "string" ? result.why : null);
    } catch (err) {
      setFields(EMPTY);
      setError(`POST /api/command-bar → ${(err as Error).message}`);
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!composed) return;
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
    } catch {
      setError("clipboard write failed — select the block and copy it manually");
    }
  }

  function selectCommand(command: CommandDef) {
    setFields((current) => ({ ...current, command: command.name }));
    setMode("manual");
    setWhy(`selected "${command.name}" from the catalogue.`);
    setError(null);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        title="⌘K — compose a command"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded border border-white/15 px-2 py-1 text-[11px] font-medium text-navy-muted transition-colors hover:border-white/30 hover:text-navy-ink"
      >
        <kbd className="font-mono text-[11px] text-navy-ink">⌘K</kbd>
        <span className="hidden sm:inline">command</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 pt-[10vh] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command bar"
            tabIndex={-1}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border-strong bg-surface"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Command bar</h2>
              {mode ? (
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {mode}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto rounded px-2 py-1 text-[12px] text-muted hover:text-ink"
              >
                Esc
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {tier === "free" ? (
                <Panel tone="gate" title="Ultra tier required">
                  The command bar maps intent with the Ultra tier. Set{" "}
                  <code className="font-mono text-[13px]">AISUPLEX_TIER=ultra</code> to compose a
                  command.
                </Panel>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="command-intent" className="mb-1 block text-[12px] font-medium text-ink-2">
                      Intent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="command-intent"
                        ref={inputRef}
                        value={intent}
                        maxLength={500}
                        onChange={(event) => setIntent(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void submit();
                          }
                        }}
                        placeholder="capture the cockpit build as an artifact"
                        className="min-w-0 flex-1 rounded border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted"
                      />
                      <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={pending || intent.trim().length === 0}
                        className="shrink-0 rounded border border-border-strong px-3 py-2 text-[13px] font-medium text-ink disabled:text-muted"
                      >
                        {pending ? "mapping…" : "Map"}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <Panel tone="error" title="Command bar unavailable">
                      <span className="font-mono text-[12px]">{error}</span> — the catalogue still
                      works; pick a command below.
                    </Panel>
                  ) : null}

                  {fields.command && composed ? (
                    <div className="space-y-2">
                      {why ? <p className="text-[12px] text-muted">{why}</p> : null}
                      <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
                        <select
                          aria-label="Source type"
                          value={fields.sourceType ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setFields((current) => ({
                              ...current,
                              sourceType: isSourceType(value) ? value : null,
                            }));
                          }}
                          className="rounded border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
                        >
                          <option value="">source: none</option>
                          {Object.entries(SOURCE_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label="Source value"
                          value={fields.sourceValue}
                          maxLength={500}
                          onChange={(event) =>
                            setFields((current) => ({
                              ...current,
                              sourceValue: event.target.value,
                            }))
                          }
                          placeholder="a path, a URL, a one-line reference"
                          className="rounded border border-border bg-bg px-2 py-1.5 text-[13px] text-ink placeholder:text-muted"
                        />
                      </div>
                      <input
                        aria-label="Additional instructions"
                        value={fields.additional}
                        maxLength={500}
                        onChange={(event) =>
                          setFields((current) => ({
                            ...current,
                            additional: event.target.value,
                          }))
                        }
                        placeholder="ADDITIONAL: save to Artifacts/…"
                        className="w-full rounded border border-border bg-bg px-2 py-1.5 text-[13px] text-ink placeholder:text-muted"
                      />
                      <div className="rounded border border-border bg-surface-2">
                        <div className="flex items-center justify-between border-b border-border px-2 py-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted">command</span>
                          <button
                            type="button"
                            onClick={() => void copy()}
                            className="rounded border border-border-strong bg-surface px-2 py-0.5 text-[12px] font-medium text-ink"
                          >
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[12.5px] leading-relaxed text-ink">
                          {composed}
                        </pre>
                      </div>
                      <p className="text-[12px] text-muted">
                        Copy is the action. Nothing here marks a stage done.
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <h3 className="mb-1 text-[12px] font-medium text-ink-2">
                      Catalogue · {commands.length}
                    </h3>
                    <div className="max-h-56 overflow-y-auto rounded border border-border">
                      {commands.map((command) => (
                        <button
                          key={command.file}
                          type="button"
                          onClick={() => selectCommand(command)}
                          className="flex w-full items-baseline gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-2"
                        >
                          <span className="text-[13px] font-medium text-ink">{command.name}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
                            {command.role || "—"}
                          </span>
                        </button>
                      ))}
                      {commands.length === 0 ? (
                        <p className="px-3 py-2 text-[13px] text-muted">
                          No catalogue — the vault command files could not be read.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
