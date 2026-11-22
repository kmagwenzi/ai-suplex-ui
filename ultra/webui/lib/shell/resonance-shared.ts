/**
 * The resonance query vocabulary — shared by the client stage and the server reader.
 *
 * Kept free of node imports so the stage can import it without dragging fs into the
 * browser bundle: the reader owns the filesystem, this owns the words.
 */
export type ResonanceQuery = "hubs" | "orphans" | "overlap";

export const RESONANCE_QUERIES: { id: ResonanceQuery; label: string }[] = [
  { id: "hubs", label: "What holds it together?" },
  { id: "orphans", label: "What is orphaned?" },
  { id: "overlap", label: "Where do focuses overlap?" },
];
