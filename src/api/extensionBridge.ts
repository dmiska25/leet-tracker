const WEBAPP_SOURCE = 'leettracker-webapp';
const EXT_SOURCE = 'leettracker-extension';

export class ExtensionUnavailable extends Error {
  code = 'EXTENSION_UNAVAILABLE';
  constructor(msg = 'Extension unavailable') {
    super(msg);
  }
}

type Req =
  | { type: 'request_chunk_manifest_since'; username: string; since: number }
  | { type: 'request_chunk_by_index'; username: string; index: number };

/**
 * Post a message to the extension and wait for a reply with exponential backoff retry.
 * Retries with delays: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms (total ~6.3s)
 * This handles race conditions where the extension content script hasn't fully loaded yet.
 */
async function postMessageWithReply<T extends Req, R>(payload: T): Promise<R> {
  const delays = [100, 200, 400, 800, 1600, 3200];
  let lastError: Error | undefined;

  for (let attemptIndex = 0; attemptIndex < delays.length; attemptIndex++) {
    try {
      const result = await attemptSingleRequest<T, R>(payload, delays[attemptIndex]);
      if (attemptIndex > 0) {
        console.log(`[ExtensionBridge] Request succeeded after ${attemptIndex + 1} attempt(s)`);
      }
      return result;
    } catch (err) {
      lastError = err as Error;
      // Don't wait after the last attempt
      if (attemptIndex < delays.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attemptIndex]));
      }
    }
  }

  // All retries exhausted
  console.warn('[ExtensionBridge] All retry attempts exhausted');
  throw lastError || new ExtensionUnavailable();
}

/**
 * Attempt a single request to the extension with a timeout
 */
function attemptSingleRequest<T extends Req, R>(payload: T, timeoutMs: number): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new ExtensionUnavailable());
    }, timeoutMs);

    function handler(ev: MessageEvent) {
      const data = ev.data;
      if (!data || data.source !== EXT_SOURCE || data.username !== payload.username) return;

      if (
        (payload.type === 'request_chunk_manifest_since' &&
          data.type === 'response_chunk_manifest') ||
        (payload.type === 'request_chunk_by_index' && data.type === 'response_chunk')
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(data as R);
      }
    }

    window.addEventListener('message', handler);
    window.postMessage({ ...payload, source: WEBAPP_SOURCE }, '*');
  });
}

export async function getManifestSince(username: string, since: number) {
  const res = await postMessageWithReply<
    Req,
    {
      source: string;
      type: 'response_chunk_manifest';
      username: string;
      chunks: any[];
      total?: number;
      totalSynced?: number;
    }
  >({ type: 'request_chunk_manifest_since', username, since });
  return {
    chunks: res.chunks,
    total: res.total,
    totalSynced: res.totalSynced,
  };
}

export async function getChunk(username: string, index: number) {
  const res = await postMessageWithReply<
    Req,
    { source: string; type: 'response_chunk'; username: string; index: number; data: any[] }
  >({ type: 'request_chunk_by_index', username, index });
  return res.data;
}
