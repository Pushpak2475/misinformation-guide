/**
 * netlify/functions/news-proxy.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * APPROACH B (RECOMMENDED) — Netlify Serverless RSS Proxy
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHY THIS BEATS rss2json / direct browser fetch:
 *  ✓ Server fetches RSS with Node (no CORS restrictions at all)
 *  ✓ No third-party API dependency — we own the parsing logic
 *  ✓ Server-side cache: ALL users share ONE fetch per 5 min
 *  ✓ SSRF protection via domain whitelist
 *  ✓ API key (if ever needed) stays server-side
 *  ✓ Same-origin from Netlify — zero CORS config on client
 *
 * SETUP:
 *  1. npm install @netlify/functions   (if not already installed)
 *  2. This file auto-deploys as /.netlify/functions/news-proxy
 *  3. No extra env vars needed for basic operation
 *
 * OPTIONAL UPGRADE:
 *  npm install fast-xml-parser  → replace regex parser with proper AST
 */

import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  imageUrl?: string;
}

interface ProxySuccessResponse {
  status: 'ok';
  source: string;
  count: number;
  items: ParsedNewsItem[];
  cachedAt: string;
}

interface ProxyErrorResponse {
  status: 'error';
  message: string;
}

type ProxyResponse = ProxySuccessResponse | ProxyErrorResponse;

// ─────────────────────────────────────────────────────────────────────────────
// SSRF PROTECTION — only domains on this whitelist can be proxied
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_DOMAINS = new Set([
  // Tier S — Wire services (reliable RSS)
  'feeds.bbci.co.uk',
  'feeds.npr.org',
  // Tier A — Major broadcasters
  'www.aljazeera.com',
  'www.theguardian.com',
  'www.cbsnews.com',
  'feeds.skynews.com',
  'rss.cnn.com',
  'www.pbs.org',
  // Tier B — Politics / Quality journalism
  'thehill.com',
  'rss.politico.com',
  // Tier C — Fact-checking
  'www.snopes.com',
  'www.politifact.com',
  'www.factcheck.org',
  'fullfact.org',
  // Indian news — Tier S (most reliable)
  'feeds.feedburner.com',      // NDTV (via FeedBurner)
  'www.thehindu.com',
  'www.hindustantimes.com',
  'timesofindia.indiatimes.com',
  'www.indiatoday.in',
  // Indian news — Tier A
  'indianexpress.com',
  'economictimes.indiatimes.com',
  'www.business-standard.com',
  // Indian news — Tier B (Hindi dailies)
  'www.bhaskar.com',           // Dainik Bhaskar
  'www.jagran.com',            // Dainik Jagran
  'www.amarujala.com',         // Amar Ujala
  // Indian news — Tier C (regional / specialised)
  'thewire.in',
  'scroll.in',
  'pib.gov.in',                // Press Information Bureau (Govt. of India)
  // Monitored / tabloid sources
  'www.dailymail.co.uk',
  'nypost.com',
  // BBC variations
  'bbc.co.uk',
]);

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE CACHE — shared across ALL function invocations (warm instances)
// ─────────────────────────────────────────────────────────────────────────────

interface ServerCacheEntry {
  response: ProxySuccessResponse;
  expiresAt: number;
}

const SERVER_CACHE = new Map<string, ServerCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getServerCached(key: string): ProxySuccessResponse | null {
  const entry = SERVER_CACHE.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) SERVER_CACHE.delete(key);
    return null;
  }
  return entry.response;
}

function setServerCached(key: string, response: ProxySuccessResponse): void {
  SERVER_CACHE.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─────────────────────────────────────────────────────────────────────────────
// XML PARSER — regex-based, zero external dependencies
// Handles both RSS 2.0 and Atom feed formats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the text content between XML tags.
 * Handles CDATA sections: <tag><![CDATA[content]]></tag>
 */
function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRe = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`,
    'i'
  );
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch?.[1]) return cdataMatch[1].trim();

  // Plain text content
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const plainMatch = xml.match(plainRe);
  return plainMatch?.[1]?.trim() ?? '';
}

/**
 * Strips HTML tags and decodes common XML entities.
 * Used to sanitize descriptions from RSS feeds.
 */
function stripHtml(raw: string, maxLen = 300): string {
  return (raw ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&[a-z]{2,6};/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Detect whether this XML is RSS 2.0 or Atom format and split into items.
 */
function splitItems(xml: string): string[] {
  // RSS 2.0 uses <item> ... </item>
  const rssItems = [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)];
  if (rssItems.length > 0) return rssItems.map((m) => m[0]);

  // Atom 1.0 uses <entry> ... </entry>
  const atomItems = [...xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)];
  return atomItems.map((m) => m[0]);
}

/**
 * Extract the href from an Atom <link> element or a plain RSS <link> element.
 * Atom: <link rel="alternate" href="https://..." />
 * RSS:  <link>https://...</link>
 */
function extractLink(itemXml: string): string {
  // Atom: href attribute
  const hrefMatch = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (hrefMatch?.[1]) return hrefMatch[1];

  // RSS 2.0: text content
  return extractTag(itemXml, 'link');
}

/**
 * Extract thumbnail image from <media:content> or <enclosure>.
 */
function extractImage(itemXml: string): string | undefined {
  const mediaMatch = itemXml.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch?.[1]) return mediaMatch[1];

  const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i);
  if (enclosureMatch?.[1]) return enclosureMatch[1];

  return undefined;
}

/**
 * Extract the channel/feed name from the root XML.
 */
function extractFeedTitle(xml: string): string {
  // RSS 2.0: first <title> in <channel>
  const channelMatch = xml.match(/<channel[\s>][\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  if (channelMatch?.[1]) return stripHtml(channelMatch[1], 80);

  // Atom: <title> at root
  return stripHtml(extractTag(xml.slice(0, 3000), 'title'), 80) || 'RSS Feed';
}

/**
 * Main XML → NewsItem parser.
 * Returns empty array on parse failure — never throws.
 */
function parseRssXml(xml: string, sourceName: string, maxItems: number): ParsedNewsItem[] {
  try {
    const items = splitItems(xml).slice(0, maxItems);
    return items
      .map((itemXml): ParsedNewsItem | null => {
        const title = stripHtml(extractTag(itemXml, 'title'), 200);
        const link = extractLink(itemXml);
        if (!title || !link) return null; // skip malformed items

        return {
          title,
          link,
          pubDate:
            extractTag(itemXml, 'pubDate') ||
            extractTag(itemXml, 'published') ||
            extractTag(itemXml, 'updated') ||
            new Date().toISOString(),
          description: stripHtml(
            extractTag(itemXml, 'description') ||
            extractTag(itemXml, 'summary') ||
            extractTag(itemXml, 'content'),
            300
          ),
          source: sourceName,
          imageUrl: extractImage(itemXml),
        };
      })
      .filter((item): item is ParsedNewsItem => item !== null);
  } catch (err) {
    console.warn(`[news-proxy] XML parse error for "${sourceName}":`, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORS HEADERS — required for browser to accept the response
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300', // CDN/browser cache 5 min
};

function jsonResponse(
  statusCode: number,
  body: ProxyResponse,
  extra: Record<string, string> = {}
): HandlerResponse {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extra },
    body: JSON.stringify(body),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const handler: Handler = async (
  event: HandlerEvent
): Promise<HandlerResponse> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { status: 'error', message: 'Method not allowed' });
  }

  const params = event.queryStringParameters ?? {};
  const rawUrl = params['url'];
  const count = Math.min(Math.max(Number(params['count'] ?? 5), 1), 10);

  // ── Validate presence ────────────────────────────────────────────────────
  if (!rawUrl) {
    return jsonResponse(400, { status: 'error', message: 'Missing required parameter: url' });
  }

  // ── Validate URL format ──────────────────────────────────────────────────
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return jsonResponse(400, { status: 'error', message: `Invalid URL: "${rawUrl}"` });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return jsonResponse(400, { status: 'error', message: 'Only http/https URLs allowed' });
  }

  // ── SSRF protection ──────────────────────────────────────────────────────
  if (!ALLOWED_DOMAINS.has(parsed.hostname)) {
    return jsonResponse(403, {
      status: 'error',
      message: `Domain "${parsed.hostname}" is not in the allowed RSS source list`,
    });
  }

  const cacheKey = `${rawUrl}::${count}`;

  // ── Server cache hit ─────────────────────────────────────────────────────
  const cached = getServerCached(cacheKey);
  if (cached) {
    return jsonResponse(200, cached, { 'X-Cache': 'HIT' });
  }

  // ── Fetch RSS XML ────────────────────────────────────────────────────────
  try {
    const rssRes = await fetch(rawUrl, {
      method: 'GET',
      headers: {
        // Identify ourselves honestly — some servers block empty user-agents
        'User-Agent': 'InfoShield-NewsProxy/4.0 (+https://infoshield.ai)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!rssRes.ok) {
      console.warn(`[news-proxy] "${rawUrl}" → HTTP ${rssRes.status}`);
      return jsonResponse(rssRes.status, {
        status: 'error',
        message: `Upstream RSS returned HTTP ${rssRes.status}`,
      });
    }

    const contentType = rssRes.headers.get('content-type') ?? '';
    const isXml =
      contentType.includes('xml') ||
      contentType.includes('rss') ||
      contentType.includes('atom') ||
      contentType.includes('text/');

    if (!isXml) {
      return jsonResponse(502, {
        status: 'error',
        message: `Unexpected content-type "${contentType}" — expected XML`,
      });
    }

    const xml = await rssRes.text();
    if (xml.length < 100) {
      return jsonResponse(502, { status: 'error', message: 'Empty or too-short RSS response' });
    }

    // ── Parse XML ──────────────────────────────────────────────────────────
    const feedTitle = extractFeedTitle(xml);
    const items = parseRssXml(xml, feedTitle, count);

    const successResponse: ProxySuccessResponse = {
      status: 'ok',
      source: feedTitle,
      count: items.length,
      items,
      cachedAt: new Date().toISOString(),
    };

    setServerCached(cacheKey, successResponse);

    return jsonResponse(200, successResponse, { 'X-Cache': 'MISS' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[news-proxy] Fetch failed for "${rawUrl}": ${msg}`);
    return jsonResponse(502, { status: 'error', message: `Proxy fetch failed: ${msg}` });
  }
};
