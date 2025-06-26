import { db } from '../storage/db';
import { getManifestSince, getChunk, ExtensionUnavailable } from '../api/extensionBridge';
import type { Solve } from '../types/types';

interface ChunkMeta {
  index: number;
  from: number;
  to: number;
}

export { ExtensionUnavailable };

/**
 * Pulls new solves (and problem descriptions) from the extension,
 * stores them in IndexedDB, and returns the number of *new* solves added.
 */
export async function syncFromExtension(username: string): Promise<number> {
  const lastTs = await db.getExtensionLastTimestamp();
  const meta: ChunkMeta[] = await getManifestSince(username, lastTs);

  if (!meta.length) return 0;

  let added = 0;
  let newestTs = lastTs;

  for (const m of meta.sort((a, b) => a.index - b.index)) {
    const rawSolves = await getChunk(username, m.index);

    for (const raw of rawSolves) {
      const p = await db.getProblem(raw.titleSlug);
      if (!p) continue; // skip if problem not found
      // Update problem description if provided
      if (raw.problemDescription) {
        p.description = raw.problemDescription;
        await db.addOrUpdateProblem(p);
      }

      // get existing solve if exists
      const existingSolve = await db.getSolve(raw.titleSlug, raw.timestamp);

      // Build Solve
      const solve: Solve = {
        ...existingSolve, // preserve existing solve data if available
        slug: raw.titleSlug,
        title: raw.titleSlug.replace(/-/g, ' '),
        timestamp: Number(raw.timestamp),
        status: raw.statusDisplay,
        lang: raw.lang,
        timeUsed: raw.solveTime ?? undefined,
        code: raw.codeDetail?.code ?? undefined,
        difficulty: p.difficulty,
        tags: p.tags,
      };

      await db.saveSolve(solve);
      added++;
      if (solve.timestamp > newestTs) newestTs = solve.timestamp;
    }
  }

  await db.setExtensionLastTimestamp(newestTs);
  return added;
}
