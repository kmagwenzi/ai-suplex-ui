/**
 * Day one — the first-run contract.
 *
 * A fresh vault renders five zeros, and a zero is indistinguishable from "healthy" to
 * someone who has never used the app: "0 open · guard clean" reads like a good report
 * about a system that does not exist yet. This module is the single source of truth for
 * what a surface says instead.
 *
 * It is deliberately **data, not logic**. Every command below is one the vault's own
 * tools expose today — copy-pasteable, deterministic, no model in the path. A step that
 * cannot be run is a lie about a capability, and a deterministic surface has no defence
 * against a lie it printed itself.
 */

export type FirstRunKey = "opportunity" | "knowledge-canvas" | "deep-ultra" | "skills" | "cockpit";

export interface FirstRunStep {
  /** The exact command. Copy, paste, run — nothing to edit. */
  command: string;
  /** What running it puts on this surface. */
  why: string;
}

export interface FirstRunSpec {
  key: FirstRunKey;
  /** The day-one headline — it names the absence, never apologises for it. */
  title: string;
  /** One sentence: what this surface needs before it can say anything true. */
  line: string;
  steps: FirstRunStep[];
}

/** What a vault has to offer, in the smallest numbers that decide "day one". */
export interface VaultSignals {
  /** Open instances across all four threads. */
  instances: number;
  /** Tasklists that carry at least one task. */
  tasklists: number;
  /** Lessons staged in Memory/lessons.md. */
  lessons: number;
}

/**
 * Day one is a **vault-level** fact, not a per-surface one: no lanes, no tasklists and
 * no memory means nothing downstream can be true. One open instance is enough to stop
 * being day one — the vault has started, and the surface's own empty states take over.
 */
export function isFirstRun(signals: VaultSignals): boolean {
  return signals.instances === 0 && signals.tasklists === 0 && signals.lessons === 0;
}

const STEP_PREFIX = /^(node Tools\/|crontab )/;

/** A step is real when it is a command this repo ships. Used by the contract test. */
export function isRunnableCommand(command: string): boolean {
  return STEP_PREFIX.test(command);
}

/**
 * The five MVP surfaces, each with the three commands that give it something true to say.
 * Ordered cheapest-first: a stranger should be able to get one surface live in minutes.
 */
export const FIRST_RUN: Record<FirstRunKey, FirstRunSpec> = {
  cockpit: {
    key: "cockpit",
    title: "Day one — the operator has nothing to operate",
    line: "The cockpit reads four things: open instances, the ritual plan, the schedule, and the receipt. None of them exists yet, so it is not reporting health — it is reporting an empty vault.",
    steps: [
      {
        command: "node Tools/asmc.js open",
        why: "The four threads as instances, the open tasklists and the staleness guard — in one screen.",
      },
      {
        command: "node Tools/ritual.js tuesday --json",
        why: "The next ritual's plan, step by step. The Rhythm scope renders exactly this.",
      },
      {
        command: "crontab -l",
        why: "The schedule the Rhythm scope reads. If it carries no ritual line, install one from Tools/cron/crontab.example.",
      },
    ],
  },
  opportunity: {
    key: "opportunity",
    title: "Day one — the pipeline is empty",
    line: "The Mapper scores what the vault already recorded: outreach, follow-ups, B-Bombs and price bands. With no record there is nothing to rank.",
    steps: [
      {
        command: "node Tools/opportunity.js --json",
        why: "The five sections as machine JSON — the same numbers these tables show.",
      },
      {
        command: "node Tools/outreach-board.js --json",
        why: "The outreach board behind the channel rates: what was sent, and what answered.",
      },
      {
        command: "node Tools/opportunity.js --board",
        why: "Write MOCs/Opportunity Dashboard.md from the same read, so the number has a place to live.",
      },
    ],
  },
  "knowledge-canvas": {
    key: "knowledge-canvas",
    title: "Day one — there is no map yet",
    line: "The canvas draws Memory/knowledge-graph.db. Nothing has scanned the vault, so the graph has no nodes — not a sparse canvas, an unbuilt one.",
    steps: [
      {
        command: "node Tools/vault-index.js",
        why: "Scan the vault — the node and edge source every graph read starts from.",
      },
      {
        command: "node Tools/knowledge-graph.js --build",
        why: "Build the graph the canvas draws, from that index.",
      },
      {
        command: "node Tools/3lm.js index",
        why: "Refresh the memory index, so the next read sees the files this one just recorded.",
      },
    ],
  },
  skills: {
    key: "skills",
    title: "Day one — no workflow has become a skill",
    line: "Skills Evolution reads Skills/ and the drafts beside it. Both are empty, so there is no queue to decide and no library to join.",
    steps: [
      {
        command: "node Tools/refresh-skill-index.js",
        why: "Index the skills that already exist — the library column fills from this.",
      },
      {
        command: "node Tools/skill-generate.js --scan",
        why: "Scan the vault's workflows for something that should become a skill.",
      },
      {
        command: "node Tools/skill-health.js --json",
        why: "Quality per skill, read from that index — what the promotion gate will weigh.",
      },
    ],
  },
  "deep-ultra": {
    key: "deep-ultra",
    title: "Day one — no battle has been recorded",
    line: "Deep Ultra renders the scoreboard of your latest tasklist, verbatim. With no tasklist there is no mission to score.",
    steps: [
      {
        command: "node Tools/deep-ultra.js latest --dry",
        why: "The scoreboard the surface renders, printed instead of drawn — proof the tool is wired.",
      },
      {
        command: "node Tools/asmc.js open",
        why: "The open tasklists the scoreboard would read, and the lanes around them.",
      },
      {
        command: "node Tools/3lm.js start --context",
        why: "Load the mission brief: recent sessions, blockers, pending B-Bombs, cross-focus links.",
      },
    ],
  },
};

/** The spec for a surface, or null for a key that is not a shipped surface. */
export function firstRunFor(key: string): FirstRunSpec | null {
  return (FIRST_RUN as Record<string, FirstRunSpec>)[key] ?? null;
}

/** The commands alone — what a test asserts and what a copy-all affordance would print. */
export function firstRunCommands(key: FirstRunKey): string[] {
  return FIRST_RUN[key].steps.map((s) => s.command);
}
