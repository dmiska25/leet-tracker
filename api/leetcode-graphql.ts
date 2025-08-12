export const config = {
  runtime: 'edge',
};

const UPSTREAM = 'https://leetcode.com/graphql';

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Add if you later need cookies:
    // 'Access-Control-Allow-Credentials': 'true',
  };
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: cors(origin),
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'POST, OPTIONS',
        ...cors(origin),
      },
    });
  }

  try {
    const body = await req.text(); // raw JSON passthrough

    const upstreamResp = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // harmless; may help if upstream looks at Referer
        Referer: 'https://leetcode.com',
      },
      body,
    });

    const text = await upstreamResp.text();

    return new Response(text, {
      status: upstreamResp.status,
      headers: {
        'Content-Type': 'application/json',
        ...cors(origin),
      },
    });
  } catch (err: any) {
    const payload = { error: 'Upstream fetch failed', detail: String(err?.message ?? err) };
    return new Response(JSON.stringify(payload), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...cors(origin),
      },
    });
  }
}
