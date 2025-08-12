export const config = {
  runtime: 'edge',
};

const UPSTREAM = 'https://leetcode.com/graphql';

function getAllowedOrigins(): string[] {
  // For Vercel, you can use environment variables
  const vercelUrl = process.env.VERCEL_URL;
  const vercelBranchUrl = process.env.VERCEL_BRANCH_URL;
  const customDomain = process.env.NEXT_PUBLIC_APP_URL;

  const origins: string[] = [];

  // Add production domain
  if (customDomain) {
    origins.push(customDomain);
  }

  // Add Vercel preview URLs
  if (vercelUrl) {
    origins.push(`https://${vercelUrl}`);
  }
  if (vercelBranchUrl) {
    origins.push(`https://${vercelBranchUrl}`);
  }

  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://localhost:5173');
  }

  return origins;
}

function cors(origin: string | null) {
  // Get the allowed origins from environment or infer from deployment
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

    const controller = new AbortController();
    const timeoutMs = 9000; // 9 seconds
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let upstreamResp: Response;
    try {
      upstreamResp = await fetch(UPSTREAM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Referer: 'https://leetcode.com',
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = upstreamResp.headers.get('content-type') || 'application/json';

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        ...cors(origin),
      },
    });
  } catch (err: any) {
    // Handle abort/timeout errors
    if (err.name === 'AbortError') {
      const payload = {
        error: 'Upstream request timeout',
        detail: 'Request to LeetCode API timed out',
      };
      return new Response(JSON.stringify(payload), {
        status: 504,
        headers: {
          'Content-Type': 'application/json',
          ...cors(origin),
        },
      });
    }
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
