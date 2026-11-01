"use client";

import { useEffect, useRef, useState } from "react";
import {
  SOURCE_LABEL,
  composePrompt,
  prefillFor,
  vaultFileOptions,
  type CopyOnlyCommand,
  type PromptCard,
  type PrefillInput,
  type SourceType,
} from "@/lib/prompts";

const MEMORY_LOOP_LABEL: Record<string, string> = {
  yes: "yes",
  conditional: "conditional",
  no: "no",
};

const SOURCE_TYPES: { id: SourceType; label: string }[] = [
  { id: "vault-file", label: "File Reference" },
  { id: "raw", label: "Raw Content" },
  { id: "chat-reference", label: "Chat Reference" },
];

/** The command catalogue: 7 dispatchable prompts + 6 copy-only, with the composer. */
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
        <Composer
          card={compose}
          prefill={prefill}
          onClose={() => setCompose(null)}
        />
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

function Composer({
  card,
  prefill,
  onClose,
}: {
  card: PromptCard;
  prefill: PrefillInput;
  onClose: () => void;
}) {
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [sourceValue, setSourceValue] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [additional, setAdditional] = useState("");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const files = vaultFileOptions(prefill);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/prompt?name=${encodeURIComponent(card.name)}`);
        const j = await r.json();
        if (!active) return;
        if (!r.ok) {
          setError(j?.error ?? "could not load the pattern");
          return;
        }
        setBody(j.text);
        const p = prefillFor(card.name, prefill);
        setSourceType(p.type);
        setSourceValue(p.value);
        setNote(p.note);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.name]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const output = body
    ? composePrompt(body, { type: sourceType, value: sourceValue }, additional)
    : null;

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the mono block is still selectable */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div
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
          {error ? (
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <div className="text-[13px] font-medium text-error">
                The pattern could not be loaded
              </div>
              <p className="mono mt-1 break-words text-[12px] text-muted">{error}</p>
            </div>
          ) : !body ? (
            <div className="mono text-[12px] text-muted">loading pattern…</div>
          ) : (
            <>
              <label className="block">
                <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                  source
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {SOURCE_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSourceType(t.id)}
                      aria-pressed={sourceType === t.id}
                      className={
                        "rounded-md border px-3 py-1.5 text-[13px] " +
                        (sourceType === t.id
                          ? "border-accent bg-accent text-on-accent"
                          : "border-border bg-surface text-ink-2 hover:text-ink")
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </span>
              </label>

              {sourceType === "vault-file" ? (
                <label className="mt-4 block">
                  <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                    file
                  </span>
                  <select
                    value={files.some((f) => f.path === sourceValue) ? sourceValue : ""}
                    onChange={(e) => setSourceValue(e.target.value)}
                    className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <option value="">choose a file…</option>
                    {files.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : sourceType ? (
                <label className="mt-4 block">
                  <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                    {SOURCE_LABEL[sourceType]}
                  </span>
                  <textarea
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    rows={5}
                    className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  />
                </label>
              ) : null}

              {note ? (
                <p className="mt-3 text-[12px] text-muted">{note}</p>
              ) : null}

              <label className="mt-5 block">
                <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                  ADDITIONAL
                </span>
                <input
                  type="text"
                  value={additional}
                  onChange={(e) => setAdditional(e.target.value)}
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
                    exact pattern text · copy-only
                  </span>
                </div>
                <pre className="mono mt-2 max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-4 text-[12px] leading-relaxed text-ink">
                  {output}
                </pre>
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-4">
          <div className="text-[12px] text-muted">
            Copy hands the exact words to your agent. A stage turns{" "}
            <span className="font-medium text-ink">done</span> only when its output
            file exists.
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={!output}
            className="rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-on-accent hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copied ? "Copied" : "Copy for my agent"}
          </button>
        </footer>
      </div>
    </div>
  );
}
