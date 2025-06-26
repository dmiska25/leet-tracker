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

export async function getManifestSince(username: string, since: number) {
  const res = await postMessageWithReply<
    Req,
    { source: string; type: 'response_chunk_manifest'; username: string; chunks: any[] }
  >({ type: 'request_chunk_manifest_since', username, since });
  return res.chunks;
}

export async function getChunk(username: string, index: number) {
  const res = await postMessageWithReply<
    Req,
    { source: string; type: 'response_chunk'; username: string; index: number; data: any[] }
  >({ type: 'request_chunk_by_index', username, index });
  return res.data;
}
