import { db } from '../storage/db';
import { getManifestSince, getChunk, ExtensionUnavailable } from '../api/extensionBridge';
import type { Solve } from '../types/types';

export { ExtensionUnavailable };

/**
 * Pulls new solves (and problem descriptions) from the extension,
 * stores them in IndexedDB, and returns the number of *new* solves added.
 */
export async function syncFromExtension(username: string): Promise<number> {
  const lastTs = await db.getExtensionLastTimestamp();
  const manifest = await getManifestSince(username, lastTs);

  if (!manifest.chunks || !manifest.chunks.length) return 0;

  let added = 0;
  let newestTs = lastTs;

  for (const m of manifest.chunks.sort((a, b) => a.index - b.index)) {
    const rawSolves = await getChunk(username, m.index);

    for (const raw of rawSolves) {
      const p = await db.getProblem(raw.titleSlug);
      if (!p) continue; // skip if problem not found

      // Update problem description if provided (handles string or { content } form)
      const descAny = (raw as any).problemDescription;
      if (descAny) {
        const content =
          typeof descAny === 'string'
            ? descAny
            : descAny && 'content' in descAny
              ? (descAny as any).content
              : undefined;
        if (typeof content === 'string') {
          p.description = content;
          await db.addOrUpdateProblem(p);
        }
      }

      // get existing solve if exists
      const existingSolve = await db.getSolve(raw.titleSlug, raw.timestamp);

      // Build Solve with extension-enriched optional fields
      const solve: Solve = {
        ...existingSolve, // preserve existing solve data if available and don't override timeUsed, code, or tags.
        slug: raw.titleSlug,
        title: raw.titleSlug.replace(/-/g, ' '),
        timestamp: Number(raw.timestamp),
        status: raw.statusDisplay,
        lang: raw.lang,

        // New optional fields
        submissionId: (raw as any).id ? String((raw as any).id) : existingSolve?.submissionId,
        timeUsed: existingSolve?.timeUsed ?? (raw as any).solveTime ?? undefined,
        code:
          existingSolve?.code ?? (raw as any).code ?? (raw as any).codeDetail?.code ?? undefined,
        difficulty: p.difficulty,
        tags: existingSolve?.tags ?? p.tags,

        // Extension-enriched structures (all optional for backward compatibility)
        submissionDetails: existingSolve?.submissionDetails ?? (raw as any).submissionDetails,
        problemNote: existingSolve?.problemNote ?? (raw as any).problemNote ?? undefined,
        codingJourney: (raw as any).codingJourney ?? existingSolve?.codingJourney,
        runEvents: (raw as any).runEvents ?? existingSolve?.runEvents,
      };

      await db.saveSolve(solve);
      added++;
      if (solve.timestamp > newestTs) newestTs = solve.timestamp;
    }
  }

  await db.setExtensionLastTimestamp(newestTs);
  return added;
}
