"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SOURCE_LABEL,
  composeEnvelope,
  fieldLine,
  isEmptySelection,
  retargetSourceValue,
  sourceLine,
  type SourceSelection,
  type SourceType,
} from "@/lib/command/envelope";
import {
  contractFor,
  prefillField,
  type CommandContract,
  type ContentField,
} from "@/lib/command/contracts";
import {
  vaultFileOptions,
  type CopyOnlyCommand,
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
          <h2 id="dispatchable" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Dispatchable
          </h2>
          <div className="mono text-[12px] text-muted">{cards.length} · mcp v1 · fetched live</div>
        </div>
        <div role="list" className="mt-3 space-y-3" aria-label="Dispatchable commands">
          {cards.map((c) => (
            <Card key={c.name} card={c} onCompose={() => setCompose(c)} />
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="copy-only">
        <div className="flex items-baseline justify-between">
          <h2 id="copy-only" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Copy-only
          </h2>
          <div className="mono text-[12px] text-muted">{copyOnly.length} · trigger + vault path</div>
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

function patternName(file: string): string {
  return file.split("/").pop() ?? file;
}

function Card({ card, onCompose }: { card: PromptCard; onCompose: () => void }) {
  const contract = contractFor(card.name);
  const inputs = card.arguments.map((a) => a.name).join(" · ") || "—";
  return (
    <div role="listitem" className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="mono text-[15px] font-medium text-ink">{card.command}</div>
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
            stage: {card.stageName}
          </span>
          <span className="mono text-[11px] text-muted">{card.executorGlyph}</span>
        </div>
      </div>
      <p className="mt-1.5 max-w-[68ch] text-[13px] text-ink-2">{card.description}</p>
      {contract ? (
        <p className="mt-1.5 max-w-[68ch] text-[12px] text-muted">
          <span className="mono text-[11px] uppercase tracking-[0.04em]">content</span>{" "}
          {contract.fields.map((f) => f.key).join(" · ")}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-3">
        <Field k="inputs" v={inputs} mono />
        <Field k="output" v={card.output} mono />
        <Field k="memory loop" v={card.memoryLoop ? MEMORY_LOOP_LABEL[card.memoryLoop] : "—"} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
          <span className="mono text-[11px]">{card.executorGlyph} {card.executorLabel}</span>
          <span aria-hidden>·</span>
          <span className="mono text-[11px] uppercase tracking-[0.04em] text-accent">mcp v1</span>
          {contract ? (
            <>
              <span aria-hidden>·</span>
              <span className="mono truncate text-[11px]" title={contract.patternFile}>
                {patternName(contract.patternFile)}
              </span>
            </>
          ) : null}
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

function Field({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="mono text-[11px] uppercase tracking-[0.04em] text-muted">{k}</dt>
      <dd className={mono ? "mono mt-0.5 text-[12px] text-ink" : "mt-0.5 text-[12px] text-ink"}>{v}</dd>
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
      <span className="mono shrink-0 text-[11px] uppercase tracking-[0.04em] text-attention">copy-only</span>
    </li>
  );
}

// ── the panel ────────────────────────────────────────────────────────────────

/**
 * A prefill is a starting value, and a picker may only show what the state
 * holds — so a `vault-file` value that is not among the options is dropped at
 * mount, never rendered as an empty control over a full state (T032).
 */
function initialValues(
  name: string,
  contract: CommandContract | undefined,
  prefill: PrefillInput,
  paths: string[],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of contract?.fields ?? []) {
    if (field.kind === "source") continue;
    const value = prefillField(name, field.key, prefill);
    values[field.key] = field.kind === "vault-file" && value !== "" && !paths.includes(value) ? "" : value;
  }
  return values;
}

function Composer({ card, prefill, onClose }: { card: PromptCard; prefill: PrefillInput; onClose: () => void }) {
  const contract = contractFor(card.name);
  const files = useMemo(() => vaultFileOptions(prefill), [prefill]);
  const paths = useMemo(() => files.map((f) => f.path), [files]);
  const instances = useMemo(
    () => prefill.threads.filter((t) => t.status === "open"),
    [prefill],
  );

  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(card.name, contract, prefill, files.map((f) => f.path)),
  );
  const [source, setSource] = useState<SourceSelection>({ type: null, value: "" });
  const [additional, setAdditional] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const fields = contract?.fields ?? [];

  const lines = useMemo(
    () =>
      fields.map((f) =>
        f.kind === "source" ? sourceLine(source) : fieldLine(f.key, values[f.key] ?? "", f.placeholder),
      ),
    [fields, source, values],
  );

  const composed = useMemo(
    () => composeEnvelope(card.command, lines, additional),
    [card.command, lines, additional],
  );

  const unfilledRequired = fields.filter((f) =>
    f.kind === "source"
      ? f.required && isEmptySelection(source)
      : f.required && (values[f.key] ?? "").trim().length === 0,
  );

  const set = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setCopied(false);
  };

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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
              compose · {card.executorLabel}
            </div>
            <h2 className="mt-0.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">{card.command}</h2>
            {contract ? (
              <>
                <p className="mt-1 text-[12px] text-ink-2">{contract.purpose}</p>
                <p className="mono mt-1 truncate text-[11px] text-muted" title={contract.patternFile}>
                  pattern: {contract.patternFile}
                </p>
              </>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="shrink-0 rounded-md px-2 py-1 text-[20px] leading-none text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-5">
          {fields.length === 0 ? (
            <p className="text-[13px] text-error">
              This command has no content contract — nothing can be composed safely.
            </p>
          ) : null}

          {fields.map((field) => (
            <ContentControl
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              source={source}
              files={files}
              instances={instances.map((t) => (t.singleton ? t.thread : `${t.ref ?? ""} · ${t.slug ?? ""}`).trim())}
              onChange={(value) => set(field.key, value)}
              onSource={(next) => {
                setSource(next);
                setCopied(false);
              }}
            />
          ))}

          <label className="mt-5 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">ADDITIONAL</span>
            <input
              type="text"
              value={additional}
              onChange={(event) => {
                setAdditional(event.target.value);
                setCopied(false);
              }}
              placeholder={contract?.additionalHint ?? "Save to …, Skip memory loop, Run <script>"}
              className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>

          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">output</span>
              <span className="mono text-[11px] text-muted">
                {unfilledRequired.length > 0
                  ? `${unfilledRequired.length} required field${unfilledRequired.length === 1 ? "" : "s"} unfilled`
                  : `${lines.length} field${lines.length === 1 ? "" : "s"} · copy-only`}
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

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border px-5 py-4">
          <div className="text-[12px] text-muted">
            {copyFailed ? (
              <span className="text-error">Clipboard unavailable — select the block and copy it.</span>
            ) : (
              <>
                Copy hands the exact words to your agent. A stage turns{" "}
                <span className="font-medium text-ink">done</span> only when its output file exists.
              </>
            )}
          </div>
          <button
            type="button"
            onClick={copy}
            className="ml-auto shrink-0 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-on-accent hover:bg-accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copied ? "Copied" : "Copy for my agent"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ContentControl({
  field,
  value,
  source,
  files,
  instances,
  onChange,
  onSource,
}: {
  field: ContentField;
  value: string;
  source: SourceSelection;
  files: { label: string; path: string }[];
  instances: string[];
  onChange: (value: string) => void;
  onSource: (source: SourceSelection) => void;
}) {
  const label = (
    <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
      {field.key}
      {field.required ? <span className="text-attention"> *</span> : null}
    </span>
  );

  if (field.kind === "source") {
    const types = field.sourceTypes ?? ["vault-file", "raw", "chat-reference"];
    const paths = files.map((f) => f.path);
    return (
      <fieldset className="mt-4">
        <legend>{label}</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {types.map((type: SourceType) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                onSource({
                  type,
                  value: retargetSourceValue(source.value, type, paths),
                })
              }
              aria-pressed={source.type === type}
              className={
                "rounded-md border px-3 py-1.5 text-[13px] " +
                (source.type === type
                  ? "border-accent bg-accent text-on-accent"
                  : "border-border bg-surface text-ink-2 hover:text-ink")
              }
            >
              {SOURCE_LABEL[type]}
            </button>
          ))}
        </div>
        {source.type === "vault-file" ? (
          <select
            value={source.value}
            onChange={(event) => onSource({ ...source, value: event.target.value })}
            aria-label="Source file"
            className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink"
          >
            <option value="">choose a file…</option>
            {files.map((f) => (
              <option key={f.path} value={f.path}>
                {f.label}
              </option>
            ))}
          </select>
        ) : source.type ? (
          <textarea
            value={source.value}
            onChange={(event) => onSource({ ...source, value: event.target.value })}
            rows={4}
            aria-label="Source content"
            className="mono mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink"
          />
        ) : null}
        <p className="mt-1.5 text-[12px] text-muted">{field.hint}</p>
      </fieldset>
    );
  }

  const common =
    "mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <label className="mt-4 block">
      {label}
      {field.kind === "raw" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder={field.placeholder}
          className={common + " mono"}
        />
      ) : field.kind === "enum" ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={common}>
          <option value="">choose…</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.kind === "vault-file" ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={common}>
          <option value="">choose a file…</option>
          {files.map((f) => (
            <option key={f.path} value={f.path}>
              {f.label}
            </option>
          ))}
        </select>
      ) : field.kind === "instance" ? (
        <>
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            list={`instances-${field.key}`}
            className={common + " mono"}
          />
          <datalist id={`instances-${field.key}`}>
            {instances.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={common}
        />
      )}
      <p className="mt-1.5 text-[12px] text-muted">{field.hint}</p>
    </label>
  );
}
