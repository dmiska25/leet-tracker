/**
 * Vercel serverless proxy for LeetCode GraphQL to avoid browser CORS.
 * - Handles OPTIONS preflight with 204 and CORS headers
 * - For POST, forwards JSON body to https://leetcode.com/graphql
 * - Returns upstream status and body verbatim (incl. 429)
 *
 * If you prefer a different route or host, set VITE_LEETCODE_GRAPHQL_URL accordingly.
 */
import { Buffer } from 'node:buffer';

const UPSTREAM = 'https://leetcode.com/graphql';

function setCors(res: any, origin?: string) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // No credentials by default; add Access-Control-Allow-Credentials: true if you need cookies
}

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin;

  if (req.method === 'OPTIONS') {
    setCors(res, origin);
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    setCors(res, origin);
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Normalize body to string
    const body =
      typeof req.body === 'string'
        ? req.body
        : req.body
          ? JSON.stringify(req.body)
          : await new Promise<string>((resolve, reject) => {
              let data = '';
              req.on('data', (chunk: Buffer) => (data += chunk.toString('utf8')));
              req.on('end', () => resolve(data || '{}'));
              req.on('error', (e: Error) => reject(e));
            });

    const upstreamResp = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Sending a LeetCode referer is harmless on the server side and can help if upstream checks it
        Referer: 'https://leetcode.com',
      },
      body,
    });

    const text = await upstreamResp.text();
    setCors(res, origin);
    res.setHeader('Content-Type', 'application/json');
    res.status(upstreamResp.status).send(text);
  } catch (err: any) {
    setCors(res, origin);
    res.status(502).json({ error: 'Upstream fetch failed', detail: String(err?.message || err) });
  }
}
