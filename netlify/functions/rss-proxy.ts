/**
 * netlify/functions/rss-proxy.ts
 *
 * ─────────────────────────────────────────────────────────────────
 * BETTER ARCHITECTURE — Netlify Serverless RSS Proxy
 * ─────────────────────────────────────────────────────────────────
 *
 * WHY THIS IS BETTER THAN DIRECT rss2json FROM BROWSER:
 *
 *  1. API key is kept server-side (not exposed in browser bundle)
 *  2. Server-side caching — all users share one cached response
 *  3. No CORS issues — same origin as the Netlify deployment
 *  4. Can parse RSS natively (no third-party rss2json dependency)
 *  5. Rate limiting is centralized — 1 server request per cache period
 *     instead of N user × M feeds requests
 *  6. Can add authentication, request validation, logging (Datadog etc.)
 *
 * SETUP:
 *  1. npm install rss-parser (or use built-in XML parsing)
 *  2. Set RSS2JSON_API_KEY in Netlify environment variables
 *  3. Deploy — function auto-routes at /.netlify/functions/rss-proxy
 *  4. Update newsService.ts to fetch from /.netlify/functions/rss-proxy
 *     instead of api.rss2json.com directly
 *
 * USAGE FROM FRONTEND:
 *  const res = await fetch(
 *    `/.netlify/functions/rss-proxy?url=${encodeURIComponent(feedUrl)}&count=5`
 *  );
 *  const { items } = await res.json();
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

// ─── Allowed RSS domains whitelist (prevents SSRF abuse) ──────────────────────
const ALLOWED_DOMAINS = new Set([
  'feeds.bbci.co.uk',
  'www.aljazeera.com',
  'www.theguardian.com',
  'feeds.npr.org',
  'www.cbsnews.com',
  'www.snopes.com',
  'www.politifact.com',
  'www.factcheck.org',
  'fullfact.org',
  'thehill.com',
  'rss.politico.com',
  'www.pbs.org',
  'feeds.skynews.com',
  'rss.cnn.com',
  'feeds.feedburner.com',
  'www.thehindu.com',
  'www.indiatoday.in',
  'timesofindia.indiatimes.com',
  'www.hindustantimes.com',
  'www.ndtv.com',
  'www.dailymail.co.uk',
  'nypost.com',
]);

// ─── Server-side in-memory cache (shared across all users) ───────────────────
interface ServerCacheEntry {
  body: string;
  expiresAt: number;
}

const _serverCache = new Map<string, ServerCacheEntry>();
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Netlify Function handler ─────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const rawUrl = event.queryStringParameters?.['url'];
  const count = Math.min(Number(event.queryStringParameters?.['count'] ?? 5), 10);

  if (!rawUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameter: url' }),
    };
  }

  // ─── Validate URL ───────────────────────────────────────────────────────────
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL format' }) };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Only http/https URLs allowed' }) };
  }

  // SSRF protection — only allow whitelisted domains
  if (!ALLOWED_DOMAINS.has(parsedUrl.hostname)) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: `Domain "${parsedUrl.hostname}" is not in the allowed list`,
      }),
    };
  }

  const cacheKey = `${rawUrl}::${count}`;

  // ─── Server cache hit ───────────────────────────────────────────────────────
  const cached = _serverCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'HIT',
      },
      body: cached.body,
    };
  }

  // ─── Fetch RSS via rss2json (with server-side API key) ─────────────────────
  try {
    const apiKey = process.env['RSS2JSON_API_KEY'] ?? '';
    const apiUrl =
      `https://api.rss2json.com/v1/api.json` +
      `?rss_url=${encodeURIComponent(rawUrl)}` +
      `&count=${count}` +
      (apiKey ? `&api_key=${apiKey}` : '');

    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: `Upstream returned ${res.status}` }),
      };
    }

    const data = await res.json() as { status: string; items?: unknown[] };
    const body = JSON.stringify(data);

    // Cache successful responses only
    if (data.status === 'ok') {
      _serverCache.set(cacheKey, {
        body,
        expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS',
      },
      body,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: `Proxy fetch failed: ${msg}` }),
    };
  }
};
