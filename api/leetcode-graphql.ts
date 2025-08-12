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

function cors(req: Request) {
  // Get the allowed origins from environment or infer from deployment
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.get('origin');

  // Type guard to ensure origin is a string before calling includes
  const isAllowed = typeof origin === 'string' && allowedOrigins.includes(origin);

  // Base headers that are always included
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Access-Control-Max-Age': '86400', // 24 hours to reduce preflight frequency
  };

  // Only include Access-Control-Allow-Origin if origin is allowed
  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  // Handle preflight requests - echo back requested headers and methods
  const requestedHeaders = req.headers.get('access-control-request-headers');
  const requestedMethod = req.headers.get('access-control-request-method');

  if (requestedHeaders) {
    headers['Access-Control-Allow-Headers'] = requestedHeaders;
  } else {
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  if (requestedMethod) {
    headers['Access-Control-Allow-Methods'] = `${requestedMethod}, OPTIONS`;
  }

  return headers;
}

export default async function handler(req: Request): Promise<Response> {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: cors(req),
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'POST, OPTIONS',
        ...cors(req),
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
        Vary: 'Origin',
        ...cors(req),
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
          'Cache-Control': 'no-store',
          ...cors(req),
        },
      });
    }
    const payload = { error: 'Upstream fetch failed', detail: String(err?.message ?? err) };
    return new Response(JSON.stringify(payload), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Expires: '0',
        Vary: 'Origin',
        ...cors(req),
      },
    });
  }
}
