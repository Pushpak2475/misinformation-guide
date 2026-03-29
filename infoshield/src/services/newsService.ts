/**
 * newsService.ts  v5 — Definitive fix for CORS + 404 proxy errors
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ROOT CAUSE OF ALL ERRORS (from console screenshot):
 *
 *  ERROR 1: "Proxy returned HTTP 404"
 *   Cause: localhost:5174 (Vite) can't serve /.netlify/functions/ — those
 *          only exist on the Netlify platform or via `netlify dev`.
 *   Fix:   In DEV mode, skip the proxy entirely and use allorigins.win
 *          as a CORS bypass. In PROD, use the Netlify Function normally.
 *
 *  ERROR 2: "blocked by CORS policy: No 'Access-Control-Allow-Origin'"
 *   Cause: Guardian, Al Jazeera, CBS, NPR don't send CORS headers.
 *          Only BBC sends "Access-Control-Allow-Origin: *".
 *   Fix:   Route ALL feeds through a CORS-capable layer:
 *          DEV  → allorigins.win (public CORS proxy, zero setup)
 *          PROD → /.netlify/functions/news-proxy (our own server)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STRATEGY MAP:
 *
 *  Development (npm run dev):
 *    fetchSource() → allorigins.win → raw XML → DOMParser → NewsItem[]
 *
 *  Production (Netlify deploy):
 *    fetchSource() → /.netlify/functions/news-proxy → JSON → NewsItem[]
 *
 *  Both environments share:
 *    • Memory + localStorage cache (5-min TTL)
 *    • Request deduplication (concurrent callers share one Promise)
 *    • Concurrency semaphore (max 3 parallel)
 *    • Rate limiter (200ms between requests)
 *    • Static fallback data (UI never empty)
 *    • Reddit, HackerNews, Mastodon (always CORS-safe, no proxy needed)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  sourceDomain: string;
  category: string;
  platform: 'RSS' | 'Fallback' | 'India' | 'FactCheck';
  imageUrl?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  url: string;
  score: number;
  numComments: number;
  subreddit: string;
  permalink: string;
  createdUtc: number;
}

export interface SocialPost {
  id: string;
  title: string;
  link: string;
  source: string;
  platform: string;
  score?: number;
  time: string;
}

export interface TrendItem {
  keyword: string;
  source: string;
  rank: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RssSource {
  name: string;
  url: string;
  domain: string;
  category: string;
}

interface CacheEntry {
  items: NewsItem[];
  expiresAt: number;
}

interface NetlifyProxyItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  imageUrl?: string;
}

interface NetlifyProxyResponse {
  status: 'ok' | 'error';
  source?: string;
  items?: NetlifyProxyItem[];
  message?: string;
}

interface AllOriginsResponse {
  contents: string;
  status: { url: string; content_type: string; http_code: number };
}

interface RedditApiChild {
  data: {
    id: string; title: string; url: string; score: number;
    num_comments: number; subreddit: string; permalink: string; created_utc: number;
  };
}

interface RedditApiResponse {
  data?: { children?: RedditApiChild[] };
}

interface HNItem { id: number; title?: string; url?: string; score?: number; time?: number; }

interface MastodonStatus {
  id?: string; content?: string; url?: string; language?: string;
  account?: { acct?: string }; created_at?: string;
}

interface InvidiousVideo { videoId?: string; title?: string; author?: string; publishedText?: string; }

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT DETECTION
//
// import.meta.env.DEV  = true  when running `npm run dev`
// import.meta.env.PROD = true  when deployed (Netlify, Vercel, etc.)
//
// This is evaluated at build time — no runtime overhead.
// ─────────────────────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV === true;

// Override via env var to test production path locally:
//   VITE_FORCE_PROXY=true npm run dev
const FORCE_PROXY = import.meta.env['VITE_FORCE_PROXY'] === 'true';

/** Whether to use the Netlify Function proxy (production path) */
const USE_NETLIFY_PROXY = !IS_DEV || FORCE_PROXY;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// 
const CONFIG = {
  /** Max items sliced from each RSS feed */
  MAX_ITEMS_PER_FEED: 8,
  /** How many primary feeds to fetch in fetchAllNews() */
  PRIMARY_FEED_COUNT: 5,
  /** Memory + localStorage cache TTL (5 minutes) */
  CACHE_TTL_MS: 5 * 60 * 1000,
  /** LocalStorage key prefix (avoids collisions) */
  LS_PREFIX: 'infoshield_news_',
  /** Min delay between outbound requests (rate limit) */
  RATE_LIMIT_MS: 200,
  /** Max parallel outbound fetches (semaphore) */
  MAX_CONCURRENT: 3,
  /** Timeout per CORS-proxy attempt */
  CORS_PROXY_TIMEOUT_MS: 9_000,
  /** Timeout for direct / Netlify-proxy fetches */
  FETCH_TIMEOUT_MS: 12_000,
  /** Netlify Function proxy endpoint */
  NETLIFY_PROXY: '/.netlify/functions/news-proxy',
  /** allorigins.win CORS proxies tried in order (dev mode) */
  DEV_CORS_PROXIES: [
    { url: 'https://api.allorigins.win/raw?url=',           type: 'raw'  as const },
    { url: 'https://corsproxy.io/?url=',                   type: 'raw'  as const },
    { url: 'https://api.allorigins.win/get?url=',          type: 'json' as const },
    { url: 'https://thingproxy.freeboard.io/fetch/',       type: 'raw'  as const },
  ],
} as const;

export const RSS_SOURCES: RssSource[] = [
  // Primary pool (first 5 used by fetchAllNews)
  { name: 'BBC World News',    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',     domain: 'bbc.com',         category: 'World'      },
  { name: 'NPR News',          url: 'https://feeds.npr.org/1001/rss.xml',                domain: 'npr.org',         category: 'US'         },
  { name: 'The Guardian World',url: 'https://www.theguardian.com/world/rss',             domain: 'theguardian.com', category: 'World'      },
  { name: 'Sky News',          url: 'https://feeds.skynews.com/feeds/rss/world.xml',     domain: 'skynews.com',     category: 'World'      },
  { name: 'Al Jazeera',        url: 'https://www.aljazeera.com/xml/rss/all.xml',        domain: 'aljazeera.com',   category: 'World'      },
  // Extended pool
  { name: 'BBC Technology',    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', domain: 'bbc.com',         category: 'Technology' },
  { name: 'Guardian Tech',     url: 'https://www.theguardian.com/technology/rss',       domain: 'theguardian.com', category: 'Technology' },
  { name: 'The Hill',          url: 'https://thehill.com/rss/syndicator/19110',         domain: 'thehill.com',     category: 'Politics'   },
  { name: 'Al Jazeera',        url: 'https://www.aljazeera.com/xml/rss/all.xml',        domain: 'aljazeera.com',   category: 'World'      },
  { name: 'CBS News',          url: 'https://www.cbsnews.com/latest/rss/main',          domain: 'cbsnews.com',     category: 'US'         },
  { name: 'Snopes',            url: 'https://www.snopes.com/feed/',                     domain: 'snopes.com',      category: 'Fact Check' },
  { name: 'PolitiFact',        url: 'https://www.politifact.com/rss/all/',              domain: 'politifact.com',  category: 'Fact Check' },
  { name: 'FactCheck.org',     url: 'https://www.factcheck.org/feed/',                  domain: 'factcheck.org',   category: 'Fact Check' },
  { name: 'Full Fact',         url: 'https://fullfact.org/feed/latest/',                domain: 'fullfact.org',    category: 'Fact Check' },
];

export const INDIA_SOURCES: RssSource[] = [
  { name: 'NDTV',              url: 'https://feeds.feedburner.com/ndtvnews-top-stories',          domain: 'ndtv.com',           category: 'India National' },
  { name: 'The Hindu',         url: 'https://www.thehindu.com/news/national/?service=rss',        domain: 'thehindu.com',       category: 'India National' },
  { name: 'India Today',       url: 'https://www.indiatoday.in/rss/1206514',                      domain: 'indiatoday.in',      category: 'India National' },
  { name: 'Times of India',    url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', domain: 'timesofindia.com',   category: 'India National' },
  { name: 'Hindustan Times',   url: 'https://www.hindustantimes.com/rss/topnews/rssfeed.xml',     domain: 'hindustantimes.com', category: 'India National' },
];

export const MISINFORMATION_SOURCES: RssSource[] = [
  { name: 'Daily Mail', url: 'https://www.dailymail.co.uk/articles.rss', domain: 'dailymail.co.uk', category: 'Tabloid' },
  { name: 'NY Post',    url: 'https://nypost.com/feed/',                  domain: 'nypost.com',      category: 'Tabloid' },
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC FALLBACK — UI shows this when ALL network requests fail
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_ITEMS: NewsItem[] = [
  { id: 'fb-1', title: 'WHO warns of coordinated health misinformation campaign on social media', description: 'The World Health Organization identified a coordinated campaign spreading health misinformation across multiple platforms.', link: 'https://who.int/news', pubDate: new Date().toISOString(), source: 'InfoShield (Offline)', sourceDomain: 'who.int', category: 'Health', platform: 'Fallback' },
  { id: 'fb-2', title: 'EU finalizes AI content labelling rules to combat deepfakes and disinformation', description: 'New European guidelines require platforms to label AI-generated content and remove verified misinformation within 24 hours.', link: 'https://ec.europa.eu', pubDate: new Date().toISOString(), source: 'InfoShield (Offline)', sourceDomain: 'ec.europa.eu', category: 'Policy', platform: 'Fallback' },
  { id: 'fb-3', title: 'MIT study: Misinformation spreads 6× faster than accurate news online', description: 'Peer-reviewed research from MIT Media Lab shows false stories reach more people faster, driven by emotional engagement and sharing incentives.', link: 'https://news.mit.edu', pubDate: new Date().toISOString(), source: 'InfoShield (Offline)', sourceDomain: 'mit.edu', category: 'Research', platform: 'Fallback' },
  { id: 'fb-4', title: '5G health claim debunked by four independent fact-checking organizations', description: 'Snopes, PolitiFact, Full Fact, and FactCheck.org have all independently verified the viral claim is false.', link: 'https://snopes.com', pubDate: new Date().toISOString(), source: 'InfoShield (Offline)', sourceDomain: 'snopes.com', category: 'Fact Check', platform: 'Fallback' },
  { id: 'fb-5', title: 'Government advisory warns citizens about AI deepfake election content', description: 'Ministry of Electronics and IT warns about sophisticated deepfake videos targeting election candidates across multiple states.', link: 'https://meity.gov.in', pubDate: new Date().toISOString(), source: 'InfoShield (Offline)', sourceDomain: 'meity.gov.in', category: 'India National', platform: 'Fallback' },
  { id: 'fb-6', title: 'X Corp removes 45,000 state-sponsored accounts in transparency report', description: 'X Corp revealed removal of accounts operated by state-sponsored actors from multiple countries in its quarterly transparency report.', link: 'https://transparency.x.com', pubDate: new Date().toISOString(), source: 'InfoShield (Offline)', sourceDomain: 'x.com', category: 'Technology', platform: 'Fallback' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CACHE — memory (instant) + localStorage (persists across page reloads)
// ─────────────────────────────────────────────────────────────────────────────

const _mem = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<NewsItem[]>>();

function lsKey(url: string): string {
  try { return CONFIG.LS_PREFIX + btoa(encodeURIComponent(url)).slice(0, 48); }
  catch { return CONFIG.LS_PREFIX + url.slice(-48); }
}

function cacheRead(url: string): NewsItem[] | null {
  const m = _mem.get(url);
  if (m && Date.now() < m.expiresAt) return m.items;
  try {
    const raw = localStorage.getItem(lsKey(url));
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    if (Date.now() > e.expiresAt) { localStorage.removeItem(lsKey(url)); return null; }
    _mem.set(url, e);
    return e.items;
  } catch { return null; }
}

function cacheWrite(url: string, items: NewsItem[]): void {
  const entry: CacheEntry = { items, expiresAt: Date.now() + CONFIG.CACHE_TTL_MS };
  _mem.set(url, entry);
  try { localStorage.setItem(lsKey(url), JSON.stringify(entry)); }
  catch { /* storage full — memory layer still works */ }
}

export function invalidateCache(): void {
  _mem.clear(); _inflight.clear();
  try {
    const del: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CONFIG.LS_PREFIX)) del.push(k);
    }
    del.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

export function getCacheStats() {
  let ls = 0;
  try { for (let i = 0; i < localStorage.length; i++) { if (localStorage.key(i)?.startsWith(CONFIG.LS_PREFIX)) ls++; } }
  catch { /* noop */ }
  return { memory: _mem.size, localStorage: ls, inflight: _inflight.size };
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER + SEMAPHORE
// ─────────────────────────────────────────────────────────────────────────────

let _lastRequest = 0;
async function rateLimitWait(): Promise<void> {
  const gap = Date.now() - _lastRequest;
  if (gap < CONFIG.RATE_LIMIT_MS) await sleep(CONFIG.RATE_LIMIT_MS - gap);
  _lastRequest = Date.now();
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

class Semaphore {
  private _n: number;
  private _q: Array<() => void> = [];
  constructor(max: number) { this._n = max; }
  async acquire(): Promise<() => void> {
    if (this._n > 0) { this._n--; return () => this._rel(); }
    return new Promise<() => void>((res) => this._q.push(() => { this._n--; res(() => this._rel()); }));
  }
  private _rel() { this._n++; this._q.shift()?.(); }
}

const _sem = new Semaphore(CONFIG.MAX_CONCURRENT);

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function cleanHtml(raw: string, maxLen = 300): string {
  return (raw ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'")
    .replace(/&[a-z]{2,8};/gi,' ').replace(/\s+/g,' ').trim().slice(0, maxLen);
}

function itemId(domain: string, idx: number, pubDate: string): string {
  return `${domain}-${idx}-${pubDate ? new Date(pubDate).getTime() : idx * 1000}`;
}

function dedupeByTitle(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = item.title.slice(0, 40).toLowerCase().trim();
    if (k.length < 8 || seen.has(k)) return false;
    seen.add(k); return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// XML PARSER (browser DOMParser)
// Works for RSS 2.0 and Atom 1.0 feeds
// ─────────────────────────────────────────────────────────────────────────────

function parseXml(xml: string, source: RssSource): NewsItem[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Malformed XML');

    // RSS 2.0 uses <item>, Atom uses <entry>
    const items = [...doc.querySelectorAll('item, entry')];

    return items
      .slice(0, CONFIG.MAX_ITEMS_PER_FEED)
      .map((el, idx): NewsItem | null => {
        const title = cleanHtml(el.querySelector('title')?.textContent ?? '', 200);

        // RSS: <link>url</link>  |  Atom: <link href="url"/>
        const link =
          el.querySelector('link[rel="alternate"]')?.getAttribute('href') ??
          el.querySelector('link:not([rel])')?.getAttribute('href') ??
          el.querySelector('link')?.textContent?.trim() ?? '';

        if (!title || !link) return null;

        const pubDate =
          el.querySelector('pubDate, published, updated')?.textContent?.trim() ??
          new Date().toISOString();

        const description = cleanHtml(
          el.querySelector('description, summary, content')?.textContent ?? '', 300
        );

        // Media thumbnail
        const imageUrl =
          el.querySelector('media\\:content, media\\:thumbnail')?.getAttribute('url') ??
          el.querySelector('enclosure[type^="image"]')?.getAttribute('url') ??
          undefined;

        return {
          id: itemId(source.domain, idx, pubDate),
          title, link, pubDate, description,
          source: source.name,
          sourceDomain: source.domain,
          category: source.category,
          platform: 'RSS',
          imageUrl,
        };
      })
      .filter((i): i is NewsItem => i !== null);
  } catch (err) {
    console.warn(`[newsService] XML parse error for "${source.name}":`, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH STRATEGIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STRATEGY A — Multi-proxy CORS chain (DEVELOPMENT ONLY)
 *
 * Tries each proxy in CONFIG.DEV_CORS_PROXIES in order:
 *   1. corsproxy.io  — returns raw XML directly
 *   2. codetabs.com  — returns raw XML directly
 *   3. allorigins.win — returns { contents: "<xml>" } JSON wrapper
 *
 * Returns items from the FIRST proxy that succeeds.
 * Throws only if ALL proxies fail.
 */
async function fetchViaCorsProxy(source: RssSource): Promise<NewsItem[]> {
  const errors: string[] = [];

  for (const proxy of CONFIG.DEV_CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy.url}${encodeURIComponent(source.url)}`;
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(CONFIG.CORS_PROXY_TIMEOUT_MS),
      });

      if (!res.ok) {
        errors.push(`${proxy.url} → HTTP ${res.status}`);
        continue;
      }

      let xmlText: string;
      if (proxy.type === 'json') {
        // allorigins.win wraps response in { contents: "<xml>" }
        const data = await res.json() as AllOriginsResponse;
        if (!data.contents || data.contents.length < 50) {
          errors.push(`${proxy.url} → empty contents (upstream HTTP ${data.status?.http_code})`);
          continue;
        }
        xmlText = data.contents;
      } else {
        // corsproxy.io / codetabs return raw XML
        xmlText = await res.text();
        if (xmlText.length < 50) {
          errors.push(`${proxy.url} → empty response`);
          continue;
        }
      }

      const items = parseXml(xmlText, source);
      if (items.length === 0) {
        errors.push(`${proxy.url} → parsed 0 items`);
        continue;
      }

      return items; // ✅ success
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${proxy.url} → ${msg}`);
    }
  }

  throw new Error(`All DEV proxies failed for "${source.name}": ${errors.join(' | ')}`);
}

/**
 * STRATEGY B — Netlify Function proxy (PRODUCTION)
 *
 * How it works:
 *  Browser → /.netlify/functions/news-proxy?url=<encoded-rss-url>
 *  Our serverless function fetches RSS server-side → parses XML → returns JSON
 *  We map the JSON → NewsItem[]
 *
 * Why this is best for production:
 *  - No CORS issues (same-origin)
 *  - Server-side cache (all users share one fetch per 5 min)
 *  - No third-party dependency
 *  - SSRF-protected (domain whitelist in the function)
 */
async function fetchViaNetlifyProxy(source: RssSource): Promise<NewsItem[]> {
  const url = `${CONFIG.NETLIFY_PROXY}?url=${encodeURIComponent(source.url)}&count=${CONFIG.MAX_ITEMS_PER_FEED}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(CONFIG.FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`Netlify proxy HTTP ${res.status}`);

  const data = await res.json() as NetlifyProxyResponse;
  if (data.status !== 'ok' || !data.items?.length) {
    throw new Error(data.message ?? 'Proxy: no items returned');
  }

  return data.items
    .filter((i) => i.title && i.link)
    .slice(0, CONFIG.MAX_ITEMS_PER_FEED)
    .map((i, idx): NewsItem => ({
      id: itemId(source.domain, idx, i.pubDate),
      title: cleanHtml(i.title, 200),
      link: i.link,
      pubDate: i.pubDate || new Date().toISOString(),
      description: cleanHtml(i.description, 300),
      source: source.name,
      sourceDomain: source.domain,
      category: source.category,
      platform: 'RSS',
      imageUrl: i.imageUrl,
    }));
}

/**
 * STRATEGY C — Direct browser fetch (BBC and other CORS-enabled feeds)
 *
 * Only BBC sends "Access-Control-Allow-Origin: *" reliably.
 * Used as a last-resort fallback — most feeds will fail CORS here.
 */
async function fetchDirect(source: RssSource): Promise<NewsItem[]> {
  const res = await fetch(source.url, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(CONFIG.FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Direct HTTP ${res.status}`);
  return parseXml(await res.text(), source);
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE FETCHER — selects correct strategy based on environment
// ─────────────────────────────────────────────────────────────────────────────

async function fetchSource(source: RssSource): Promise<NewsItem[]> {
  // Cache hit — fastest
  const cached = cacheRead(source.url);
  if (cached) return cached;

  // Dedup concurrent callers
  const existing = _inflight.get(source.url);
  if (existing) return existing;

  const promise = (async (): Promise<NewsItem[]> => {
    const release = await _sem.acquire();
    try {
      await rateLimitWait();
      let items: NewsItem[] = [];

      if (USE_NETLIFY_PROXY) {
        // ── PRODUCTION PATH: Netlify Function ──────────────────────────────
        try {
          items = await fetchViaNetlifyProxy(source);
          if (items.length > 0) {
            cacheWrite(source.url, items);
            return items;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[newsService] "${source.name}" proxy failed: ${msg}`);
        }

        // Netlify proxy failed → try direct (BBC fallback)
        try {
          items = await fetchDirect(source);
          if (items.length > 0) {
            cacheWrite(source.url, items);
            return items;
          }
        } catch {
          /* CORS will block most — silent */ 
        }

      } else {
        // ── DEVELOPMENT PATH: multi-proxy CORS chain ───────────────────────
        try {
          items = await fetchViaCorsProxy(source);
          if (items.length > 0) {
            cacheWrite(source.url, items);
            return items;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[newsService] DEV "${source.name}" all proxies failed: ${msg}`);
        }

        // All proxies failed → try direct as last resort (works for BBC)
        try {
          items = await fetchDirect(source);
          if (items.length > 0) {
            cacheWrite(source.url, items);
            return items;
          }
        } catch {
          /* silent CORS block */
        }
      }

      return [];
    } finally {
      release();
      _inflight.delete(source.url);
    }
  })();

  _inflight.set(source.url, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAllNews(
  limit = 30,
  sources: RssSource[] = RSS_SOURCES.slice(0, CONFIG.PRIMARY_FEED_COUNT)
): Promise<NewsItem[]> {
  // Dev-only debug log (suppressed in production builds)
  if (import.meta.env.DEV) {
    console.debug(
      `[newsService] Fetching ${sources.length} sources via ${
        USE_NETLIFY_PROXY ? 'Netlify proxy (prod)' : 'CORS proxy (dev)'
      }`
    );
  }

  const results = await Promise.allSettled(sources.map((s) => fetchSource(s)));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  const deduped = dedupeByTitle(all).slice(0, limit);

  if (deduped.length === 0) {
    console.warn('[newsService] All feeds failed — showing fallback data.');
    if (IS_DEV) {
      console.info(
        '[newsService] DEV TIP: If feeds are failing, run:\n' +
        '  netlify dev\n' +
        'This starts both Vite (port 5174) and Netlify Functions (port 8888).\n' +
        'Then set VITE_FORCE_PROXY=true in .env to use the Netlify proxy locally.'
      );
    }
    return FALLBACK_ITEMS.slice(0, limit);
  }

  return deduped;
}

export async function fetchExtendedNews(limit = 60): Promise<NewsItem[]> {
  return fetchAllNews(limit, RSS_SOURCES);
}

export async function fetchIndiaNews(limit = 20): Promise<NewsItem[]> {
  return fetchAllNews(limit, INDIA_SOURCES);
}

export async function fetchMisinformationSources(limit = 15): Promise<NewsItem[]> {
  return fetchAllNews(limit, MISINFORMATION_SOURCES);
}

export async function fetchFactCheckNews(limit = 20): Promise<NewsItem[]> {
  return fetchAllNews(limit, RSS_SOURCES.filter((s) => s.category === 'Fact Check'));
}

export async function fetchNewsFromSource(source: RssSource): Promise<NewsItem[]> {
  return fetchSource(source);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRENDING
// ─────────────────────────────────────────────────────────────────────────────

const _FALLBACK_TRENDS: TrendItem[] = [
  'AI Misinformation','Deepfakes','Fact Check','Election Integrity','Vaccine Info',
  'Social Media Hoax','Climate Denial','Cyber Attack','Data Breach','Political Propaganda',
  'Health Advisory','Economic Misinfo','Natural Disaster','Diplomatic Crisis','Media Bias',
].map((keyword, rank) => ({ keyword, source: 'InfoShield Trending', rank }));

export async function fetchGoogleTrends(): Promise<TrendItem[]> {
  try {
    const hn = await fetchHackerNews(15);
    if (hn.length > 0) return hn.map((i, r) => ({ keyword: i.title.slice(0, 70), source: 'HackerNews', rank: r }));
  } catch { /* fall through */ }
  try {
    const bbc = await fetchSource(RSS_SOURCES[0]);
    if (bbc.length > 0) return bbc.map((i, r) => ({ keyword: i.title.slice(0, 70), source: 'BBC World', rank: r }));
  } catch { /* fall through */ }
  return _FALLBACK_TRENDS;
}

// ─────────────────────────────────────────────────────────────────────────────
// REDDIT (direct — always CORS-safe)
// ─────────────────────────────────────────────────────────────────────────────

const _REDDIT_NEWS = ['worldnews','news','politics','science','technology'];
const _REDDIT_MISINFO = ['conspiracy','Disinfo'];

async function fetchSubreddit(sub: string): Promise<RedditPost[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10&raw_json=1`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as RedditApiResponse;
    return (data.data?.children ?? []).map((c) => ({
      id: c.data.id, title: c.data.title, url: c.data.url, score: c.data.score,
      numComments: c.data.num_comments, subreddit: c.data.subreddit,
      permalink: `https://reddit.com${c.data.permalink}`, createdUtc: c.data.created_utc,
    }));
  } catch { return []; }
}

export async function fetchRedditTrending(includeConspiracy = true): Promise<RedditPost[]> {
  const subs = includeConspiracy ? [..._REDDIT_NEWS.slice(0,3),..._REDDIT_MISINFO.slice(0,2)] : _REDDIT_NEWS;
  return fetchSubreddit(subs[Math.floor(Date.now() / 60_000) % subs.length]);
}

export async function fetchAllRedditSubs(): Promise<{ sub: string; posts: RedditPost[] }[]> {
  const results = await Promise.allSettled(
    [..._REDDIT_NEWS,..._REDDIT_MISINFO].map(async (sub) => ({ sub, posts: await fetchSubreddit(sub) }))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ sub: string; posts: RedditPost[] }> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ─────────────────────────────────────────────────────────────────────────────
// HACKER NEWS (Firebase — always CORS-safe)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchHackerNews(limit = 10): Promise<SocialPost[]> {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return [];
    const ids = await res.json() as number[];
    const stories = await Promise.allSettled(
      ids.slice(0, limit).map(async (id): Promise<HNItem> => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(4_000) });
        if (!r.ok) return { id };
        return r.json() as Promise<HNItem>;
      })
    );
    return stories
      .filter((s): s is PromiseFulfilledResult<HNItem> => s.status === 'fulfilled' && !!s.value.title)
      .map((s) => ({
        id: String(s.value.id), title: s.value.title ?? 'Untitled',
        link: s.value.url ?? `https://news.ycombinator.com/item?id=${s.value.id}`,
        source: 'Hacker News', platform: 'HackerNews', score: s.value.score,
        time: s.value.time ? new Date(s.value.time * 1000).toLocaleTimeString() : '',
      }));
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTODON (public API — CORS-safe)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchMastodon(limit = 10): Promise<SocialPost[]> {
  // mastodon.social /v1/timelines/public requires auth since 2023.
  // Use the hashtag timeline which is still anonymous-readable.
  const tags = ['news', 'worldnews', 'journalism'];
  for (const tag of tags) {
    try {
      const res = await fetch(
        `https://mastodon.social/api/v1/timelines/tag/${tag}?limit=${Math.ceil(limit / tags.length)}&local=false`,
        { signal: AbortSignal.timeout(6_000) }
      );
      if (!res.ok) continue; // 422 or 4xx → try next tag
      const posts = await res.json() as MastodonStatus[];
      if (!Array.isArray(posts) || posts.length === 0) continue;
      return posts
        .filter((p) => p.content && p.url && p.language !== 'ja')
        .slice(0, limit)
        .map((p, i) => ({
          id: String(p.id ?? i),
          title: cleanHtml(p.content ?? '', 140) || 'Mastodon post',
          link: p.url ?? '#',
          source: `@${p.account?.acct ?? 'mastodon'}`,
          platform: 'Mastodon',
          time: p.created_at ? new Date(p.created_at).toLocaleTimeString() : '',
        }));
    } catch { /* try next tag */ }
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE (Invidious — no API key)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchYouTubeTrending(limit = 6): Promise<SocialPost[]> {
  for (const base of ['https://inv.nadeko.net','https://invidious.privacydev.net','https://invidious.fdn.fr']) {
    try {
      const res = await fetch(`${base}/api/v1/trending?region=US&type=news`, { signal: AbortSignal.timeout(5_000) });
      if (!res.ok) continue;
      const videos = await res.json() as InvidiousVideo[];
      if (!Array.isArray(videos) || !videos.length) continue;
      return videos.slice(0, limit).map((v, i) => ({
        id: v.videoId ?? `yt-${i}`, title: v.title ?? 'YouTube Video',
        link: `https://youtube.com/watch?v=${v.videoId ?? ''}`,
        source: v.author ?? 'YouTube', platform: 'YouTube', time: v.publishedText ?? 'recent',
      }));
    } catch { /* try next */ }
  }
  return [];
}

export async function fetchAllSocialPlatforms() {
  const [reddit, hackerNews, mastodon, youtube] = await Promise.allSettled([
    fetchRedditTrending(true), fetchHackerNews(8), fetchMastodon(8), fetchYouTubeTrending(5),
  ]);
  return {
    reddit:     reddit.status     === 'fulfilled' ? reddit.value     : [],
    hackerNews: hackerNews.status === 'fulfilled' ? hackerNews.value : [],
    mastodon:   mastodon.status   === 'fulfilled' ? mastodon.value   : [],
    youtube:    youtube.status    === 'fulfilled' ? youtube.value    : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED STUBS — import compatibility only
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchNitterFeed(): Promise<SocialPost[]> { return []; }
export async function fetchTelegramChannels(): Promise<SocialPost[]> { return []; }
