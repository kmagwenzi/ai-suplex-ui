"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CREATABLE_LANES,
  slugFromTitle,
  tasksFromText,
  validateCreate,
} from "@/lib/workspace-create-form";

export interface CreatedWorkspace {
  ok?: boolean;
  ref?: number;
  instance?: string;
  tasklist?: string;
}

/**
 * The console's creation form (P003). It composes a draft and posts it to
 * /api/workspaces/create — the vault does the writing. Nothing is written
 * from the browser, and no field claims an input the tool does not take.
 */
export function WorkspaceCreate() {
  const router = useRouter();
  const [thread, setThread] = useState<string>("project-tasks");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [mission, setMission] = useState("");
  const [tasks, setTasks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedWorkspace | null>(null);

  const derivedSlug = slugTouched && slug ? slug : slugFromTitle(title);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateCreate({ thread, slug: derivedSlug, title, mission, tasks });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          thread,
          slug: derivedSlug,
          title,
          mission,
          tasks: tasksFromText(tasks),
        }),
      });
      const payload = (await res.json()) as CreatedWorkspace & { error?: string };
      if (!res.ok) throw new Error(payload.error || "could not open the workspace");
      setCreated(payload);
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setMission("");
      setTasks("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink";
  const label = "mono text-[10px] uppercase tracking-[0.04em] text-muted";

  return (
    <details className="mt-6 rounded-lg border border-border bg-surface p-5">
      <summary className="cursor-pointer text-[15px] font-semibold tracking-[-0.01em] text-ink">
        New workspace
      </summary>
      <p className="mt-2 max-w-[62ch] text-[12px] text-muted">
        Opens a Project or Quick Task lane — one context file and one tasklist,
        written by the vault through suplex_workspace_create. The board refreshes
        after the write.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <div>
          <label htmlFor="ws-thread" className={label}>
            lane
          </label>
          <select
            id="ws-thread"
            value={thread}
            onChange={(e) => setThread(e.target.value)}
            className={field}
          >
            {CREATABLE_LANES.map((lane) => (
              <option key={lane} value={lane}>
                {lane === "project-tasks" ? "Project" : "Quick Task"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ws-title" className={label}>
            title
          </label>
          <input
            id="ws-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ship the workflow console"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="ws-slug" className={label}>
            slug
          </label>
          <input
            id="ws-slug"
            value={derivedSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugFromTitle(e.target.value));
            }}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="ws-mission" className={label}>
            mission
          </label>
          <textarea
            id="ws-mission"
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={2}
            placeholder="One sentence that says what done means"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="ws-tasks" className={label}>
            tasks (one per line, optional)
          </label>
          <textarea
            id="ws-tasks"
            value={tasks}
            onChange={(e) => setTasks(e.target.value)}
            rows={3}
            placeholder={"read the vault\nbuild the surface"}
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="justify-self-start rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent hover:bg-accent-ink disabled:opacity-60"
        >
          {busy ? "Opening…" : "Open workspace"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-md border border-border bg-surface-2 p-3 text-[13px] text-error">
          {error}
        </p>
      ) : null}

      {created?.ok ? (
        <div className="mt-3 rounded-md border border-border bg-surface-2 p-3 text-[12px] text-ink-2">
          <p className="font-medium text-ink">
            Opened ref {created.ref}
          </p>
          <p className="mono mt-1 break-words text-[11px] text-muted">
            {created.instance}
          </p>
          <p className="mono break-words text-[11px] text-muted">
            {created.tasklist}
          </p>
        </div>
      ) : null}
    </details>
  );
}
