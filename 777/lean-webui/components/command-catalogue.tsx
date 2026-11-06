"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SOURCE_LABEL,
  SOURCE_TYPES,
  composeCommand,
  isEmptySelection,
  retargetSourceValue,
  type SourceType,
} from "@/lib/command/envelope";
import {
  prefillFor,
  vaultFileOptions,
  type CopyOnlyCommand,
  type Prefill,
  type PromptCard,
  type PrefillInput,
} from "@/lib/prompts";

const MEMORY_LOOP_LABEL: Record<string, string> = {
  yes: "yes",
  conditional: "conditional",
  no: "no",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The command catalogue: 7 dispatchable prompts + the copy-only rows, with the panel. */
export function CommandCatalogue({
  cards,
  prefill,
  copyOnly,
}: {
  cards: PromptCard[];
  prefill: PrefillInput;
  copyOnly: CopyOnlyCommand[];
}) {
  const [compose, setCompose] = useState<PromptCard | null>(null);

  return (
    <>
      <section className="mt-8" aria-labelledby="dispatchable">
        <div className="flex items-baseline justify-between">
          <h2
            id="dispatchable"
            className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
          >
            Dispatchable
          </h2>
          <div className="mono text-[12px] text-muted">
            {cards.length} · mcp v1 · fetched live
          </div>
        </div>
        <div role="list" className="mt-3 space-y-3" aria-label="Dispatchable commands">
          {cards.map((c) => (
            <Card key={c.name} card={c} onCompose={() => setCompose(c)} />
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="copy-only">
        <div className="flex items-baseline justify-between">
          <h2
            id="copy-only"
            className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
          >
            Copy-only
          </h2>
          <div className="mono text-[12px] text-muted">
            {copyOnly.length} · trigger + vault path
          </div>
        </div>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {copyOnly.map((c) => (
            <CopyOnlyRow key={c.command} c={c} />
          ))}
        </ul>
      </section>

      {compose ? (
        <Composer card={compose} prefill={prefill} onClose={() => setCompose(null)} />
      ) : null}
    </>
  );
}

function Card({
  card,
  onCompose,
}: {
  card: PromptCard;
  onCompose: () => void;
}) {
  const inputs = card.arguments.map((a) => a.name).join(" · ") || "—";
  return (
    <div
      role="listitem"
      className="rounded-lg border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="mono text-[15px] font-medium text-ink">{card.command}</div>
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
            stage: {card.stageName}
          </span>
          <span className="mono text-[11px] text-muted">{card.executorGlyph}</span>
        </div>
      </div>
      <p className="mt-1.5 max-w-[68ch] text-[13px] text-ink-2">
        {card.description}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-3">
        <Field k="inputs" v={inputs} mono />
        <Field k="output" v={card.output} mono />
        <Field
          k="memory loop"
          v={card.memoryLoop ? MEMORY_LOOP_LABEL[card.memoryLoop] : "—"}
        />
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className="mono text-[11px]">{card.executorGlyph} {card.executorLabel}</span>
          <span aria-hidden>·</span>
          <span className="mono text-[11px] uppercase tracking-[0.04em] text-accent">
            mcp v1
          </span>
        </div>
        <button
          type="button"
          onClick={onCompose}
          className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent hover:bg-accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Compose
        </button>
      </div>
    </div>
  );
}

function Field({
  k,
  v,
  mono = false,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
        {k}
      </dt>
      <dd className={mono ? "mono mt-0.5 text-[12px] text-ink" : "mt-0.5 text-[12px] text-ink"}>
        {v}
      </dd>
    </div>
  );
}

function CopyOnlyRow({ c }: { c: CopyOnlyCommand }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-3">
      <div className="min-w-0">
        <div className="mono text-[14px] font-medium text-ink">{c.trigger}</div>
        <div className="mono mt-0.5 truncate text-[11px] text-muted">{c.link}</div>
      </div>
      <span className="mono shrink-0 text-[11px] uppercase tracking-[0.04em] text-attention">
        copy-only
      </span>
    </li>
  );
}

// ── the panel ────────────────────────────────────────────────────────────────

/** One state object. The command is a pure function of it — nothing else. */
interface Fields {
  sourceType: SourceType | null;
  sourceValue: string;
  additional: string;
}

/**
 * A prefill is a starting value, and the picker may only show what the state
 * holds. A `vault-file` prefill that is not among the picker's own options is
 * therefore dropped at mount (never rendered as an empty control over a full
 * state) — the note says why.
 */
function initialFields(p: Prefill, paths: string[]): Fields {
  const resolvable = p.type !== "vault-file" || p.value === "" || paths.includes(p.value);
  return {
    sourceType: p.type,
    sourceValue: resolvable ? p.value : "",
    additional: "",
  };
}

function Composer({
  card,
  prefill,
  onClose,
}: {
  card: PromptCard;
  prefill: PrefillInput;
  onClose: () => void;
}) {
  const files = useMemo(() => vaultFileOptions(prefill), [prefill]);
  const paths = useMemo(() => files.map((f) => f.path), [files]);
  const prefillValue = useMemo(() => prefillFor(card.name, prefill), [card.name, prefill]);

  const [fields, setFields] = useState<Fields>(() => initialFields(prefillValue, paths));
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const composed = useMemo(
    () =>
      composeCommand(
        card.command,
        { type: fields.sourceType, value: fields.sourceValue },
        fields.additional,
      ),
    [card.command, fields],
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function chooseSourceType(next: SourceType) {
    setFields((current) => ({
      ...current,
      sourceType: next,
      sourceValue: retargetSourceValue(current.sourceValue, next, paths),
    }));
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
    }
  }

  const unfilled = isEmptySelection({
    type: fields.sourceType,
    value: fields.sourceValue,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Compose ${card.command}`}
        className="relative flex h-full w-full max-w-[600px] flex-col border-l border-border bg-surface"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
              compose · {card.executorLabel}
            </div>
            <h2 className="mt-0.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
              {card.command}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="rounded-md px-2 py-1 text-[20px] leading-none text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-5">
          <fieldset>
            <legend className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
              source
            </legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => chooseSourceType(type)}
                  aria-pressed={fields.sourceType === type}
                  className={
                    "rounded-md border px-3 py-1.5 text-[13px] " +
                    (fields.sourceType === type
                      ? "border-accent bg-accent text-on-accent"
                      : "border-border bg-surface text-ink-2 hover:text-ink")
                  }
                >
                  {SOURCE_LABEL[type]}
                </button>
              ))}
            </div>
          </fieldset>

          {fields.sourceType === "vault-file" ? (
            <label className="mt-4 block">
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                file
              </span>
              <select
                value={fields.sourceValue}
                onChange={(event) =>
                  setFields((current) => ({ ...current, sourceValue: event.target.value }))
                }
                className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <option value="">choose a file…</option>
                {files.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.label}
                  </option>
                ))}
              </select>
            </label>
          ) : fields.sourceType ? (
            <label className="mt-4 block">
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                {SOURCE_LABEL[fields.sourceType]}
              </span>
              <textarea
                value={fields.sourceValue}
                onChange={(event) =>
                  setFields((current) => ({ ...current, sourceValue: event.target.value }))
                }
                rows={5}
                placeholder={
                  fields.sourceType === "chat-reference"
                    ? "describe the earlier conversation"
                    : "paste the content"
                }
                className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </label>
          ) : null}

          {prefillValue.note ? (
            <p className="mt-3 text-[12px] text-muted">{prefillValue.note}</p>
          ) : null}

          <label className="mt-5 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
              ADDITIONAL
            </span>
            <input
              type="text"
              value={fields.additional}
              onChange={(event) =>
                setFields((current) => ({ ...current, additional: event.target.value }))
              }
              placeholder="Save to …, Skip memory loop, Run <script>"
              className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>

          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                output
              </span>
              <span className="mono text-[11px] text-muted">
                {unfilled ? "unfilled — the placeholders show what remains" : "5 lines · copy-only"}
              </span>
            </div>
            <pre
              data-testid="composed-command"
              className="mono mt-2 max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-4 text-[12px] leading-relaxed text-ink"
            >
              {composed}
            </pre>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
          <div className="text-[12px] text-muted">
            {copyFailed ? (
              <span className="text-error">
                Clipboard unavailable — select the block and copy it.
              </span>
            ) : (
              <>
                Copy hands the exact words to your agent. A stage turns{" "}
                <span className="font-medium text-ink">done</span> only when its
                output file exists.
              </>
            )}
          </div>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-on-accent hover:bg-accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copied ? "Copied" : "Copy for my agent"}
          </button>
        </footer>
      </div>
    </div>
  );
}
