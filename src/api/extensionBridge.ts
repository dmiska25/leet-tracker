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
 * Sends a message to the browser extension and waits for a corresponding reply.
 *
 * The function posts the given payload to the extension and listens for a reply message that matches the request type and username. If a valid response is received within 100ms, the promise resolves with the response data. If no response arrives in time, the promise is rejected with an `ExtensionUnavailable` error.
 *
 * @param payload - The request payload to send to the extension
 * @returns A promise that resolves with the extension's response data
 */
function postMessageWithReply<T extends Req, R>(payload: T): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new ExtensionUnavailable());
    }, 100);

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

/**
 * Retrieves the chunk manifest for a user from the extension, including only chunks created since the specified timestamp.
 *
 * @param username - The username whose chunk manifest is requested
 * @param since - The timestamp (in milliseconds) to filter chunks created after
 * @returns An array of chunk manifest entries from the extension
 */
export async function getManifestSince(username: string, since: number) {
  const res = await postMessageWithReply<
    Req,
    { source: string; type: 'response_chunk_manifest'; username: string; chunks: any[] }
  >({ type: 'request_chunk_manifest_since', username, since });
  return res.chunks;
}

/**
 * Retrieves a specific chunk of data for a user from the browser extension by index.
 *
 * @param username - The username associated with the requested chunk
 * @param index - The index of the chunk to retrieve
 * @returns The data array for the specified chunk
 */
export async function getChunk(username: string, index: number) {
  const res = await postMessageWithReply<
    Req,
    { source: string; type: 'response_chunk'; username: string; index: number; data: any[] }
  >({ type: 'request_chunk_by_index', username, index });
  return res.data;
}
