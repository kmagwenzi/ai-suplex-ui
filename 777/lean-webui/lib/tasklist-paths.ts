/**
 * tasklist-paths.ts — where a tasklist body may live.
 *
 * `suplex://tasklist/{path}` is jailed to `Tasklists/`, and the summaries the
 * vault returns carry only a basename. So a reader tries the known folders in
 * order instead of guessing one — and every reader shares this list.
 */

export const TASKLIST_DIRS = ["Active", "Archive", "Combined"] as const;

/** The resource paths to try for one tasklist basename. */
export function tasklistCandidates(file: string): string[] {
  return TASKLIST_DIRS.map((dir) => `Tasklists/${dir}/${file}`);
}