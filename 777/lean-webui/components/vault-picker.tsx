"use client";

import { useEffect, useState } from "react";

interface VaultState {
  configured: string | null;
  env: string | null;
  resolved: string | null;
  cycle: number | null;
  week: number | null;
}

declare global {
  interface Window {
    /** The desktop shell's one capability (electron/preload.js). */
    suplexDesktop?: { pickVault: () => Promise<string | null> };
  }
}

/**
 * The one thing Setup must let you do: point the console at a vault.
 *
 * It writes the console's own .console.json (never the vault), the API validates
 * that the path carries period.md, and the harness is restarted so the next read
 * comes from the chosen vault — no app reboot.
 *
 * In the desktop app the path is not typed: the shell opens a native folder
 * chooser (CHOOSE_FOLDER), and the same validation runs on whatever comes back.
 */
export function VaultPicker() {
  const [state, setState] = useState<VaultState | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(Boolean(window.suplexDesktop));
    fetch("/api/setup/vault")
      .then((r) => r.json())
      .then((j: VaultState) => {
        setState(j);
        setPath(j.configured ?? j.resolved ?? "");
      })
      .catch(() => setError("could not read the current setting"));
  }, []);

  async function useVault(candidate: string) {
    if (!candidate.trim()) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/setup/vault", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: candidate }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "could not set that vault");
        return;
      }
      setState(j as VaultState);
      setSaved((j as VaultState).resolved ?? candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function choose() {
    const picked = await window.suplexDesktop?.pickVault();
    if (!picked) return;
    setPath(picked);
    await useVault(picked);
  }

  const field =
    "mt-1 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink";
  const onSample = Boolean(state?.env && /sample-vault\b/.test(state.env));

  return (
    <section
      className="mt-8 rounded-lg border border-border bg-surface p-6"
      aria-labelledby="vault-picker"
    >
      <h2 id="vault-picker" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        Which vault
      </h2>
      <p className="mt-1 max-w-[70ch] text-[12px] text-muted">
        The console opens one vault at a time. Point it at the folder that holds{" "}
        <span className="mono text-[11px]">period.md</span> — the setting is stored in
        the console&apos;s own <span className="mono text-[11px]">.console.json</span>,
        never written into the vault.
      </p>

      {onSample ? (
        <p className="mt-3 rounded-md border border-border bg-surface-2 p-3 text-[12px] text-ink-2">
          You are reading the <span className="font-medium text-ink">sample vault</span>{" "}
          bundled with the app, so nothing here is your work. Choose your own vault to
          start.
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void useVault(path);
        }}
        className="mt-4 grid gap-3"
      >
        <div>
          <label htmlFor="vault-path" className="mono text-[10px] uppercase tracking-[0.04em] text-muted">
            vault path
          </label>
          <div className="flex items-stretch gap-2">
            <input
              id="vault-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/home/you/Projects/AI-Suplex-777"
              className={field + " flex-1"}
              spellCheck={false}
            />
            {desktop ? (
              <button
                type="button"
                onClick={choose}
                disabled={busy}
                className="mt-1 shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink-2 hover:border-border-strong hover:text-ink disabled:opacity-60"
              >
                Choose folder…
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || path.trim().length === 0}
          className="justify-self-start rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent hover:bg-accent-ink disabled:opacity-60"
        >
          {busy ? "Pointing…" : "Use this vault"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-md border border-border bg-surface-2 p-3 text-[13px] text-error">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="mt-3 rounded-md border border-border bg-surface-2 p-3 text-[13px] text-ink-2">
          Now reading <span className="mono text-[12px]">{saved}</span>
          {state?.cycle ? " · Cycle " + state.cycle + " · Week " + state.week : ""} —{" "}
          <button
            type="button"
            onClick={() => location.reload()}
            className="text-accent hover:text-accent-ink"
          >
            reload the console
          </button>
        </p>
      ) : null}

      {state?.resolved ? (
        <dl className="mono mt-3 space-y-1 text-[11px] text-muted">
          <div>resolved: {state.resolved}</div>
          <div>configured: {state.configured ?? "— (using harness default)"}</div>
          <div>env AISUPLEX_VAULT: {state.env ?? "—"}</div>
        </dl>
      ) : null}
    </section>
  );
}
