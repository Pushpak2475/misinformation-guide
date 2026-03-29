/**
 * newsService.ts — Multi-platform social + news aggregation
 * Expanded to 20+ RSS sources + Reddit + HN + Mastodon + Nitter + Telegram channels
 */

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  sourceDomain: string;
  category: string;
  platform: string;
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

// ── CORS proxy for RSS
const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

// ── Mainstream trusted RSS sources (10 headline publishers)
export const RSS_SOURCES = [
  { name: 'BBC News',      url: 'https://feeds.bbci.co.uk/news/world/rss.xml',            domain: 'bbc.com',        category: 'World' },
  { name: 'Reuters',       url: 'https://feeds.reuters.com/reuters/topNews',               domain: 'reuters.com',    category: 'World' },
  { name: 'AP News',       url: 'https://rsshub.app/apnews/topics/apf-topnews',            domain: 'apnews.com',     category: 'World' },
  { name: 'Google News',   url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', domain: 'google.com',     category: 'Trending' },
  { name: 'CNN',           url: 'http://rss.cnn.com/rss/edition.rss',                      domain: 'cnn.com',        category: 'World' },
  { name: 'NPR',           url: 'https://feeds.npr.org/1001/rss.xml',                      domain: 'npr.org',        category: 'US' },
  { name: 'Al Jazeera',    url: 'https://www.aljazeera.com/xml/rss/all.xml',               domain: 'aljazeera.com',  category: 'World' },
  { name: 'The Guardian',  url: 'https://www.theguardian.com/world/rss',                   domain: 'theguardian.com', category: 'World' },
  { name: 'NBC News',      url: 'https://feeds.nbcnews.com/nbcnews/public/news',           domain: 'nbcnews.com',    category: 'US' },
  { name: 'CBS News',      url: 'https://www.cbsnews.com/latest/rss/main',                 domain: 'cbsnews.com',    category: 'US' },
  { name: 'The Hill',      url: 'https://thehill.com/rss/syndicator/19110',                domain: 'thehill.com',    category: 'Politics' },
  { name: 'Politico',      url: 'https://rss.politico.com/politics-news.xml',              domain: 'politico.com',   category: 'Politics' },
  { name: 'Bloomberg',     url: 'https://feeds.bloomberg.com/politics/news.rss',           domain: 'bloomberg.com',  category: 'Business' },
  { name: 'PBS NewsHour',  url: 'https://www.pbs.org/newshour/feeds/rss/headlines',        domain: 'pbs.org',        category: 'US' },
  { name: 'Sky News',      url: 'https://feeds.skynews.com/feeds/rss/world.xml',           domain: 'skynews.com',    category: 'World' },
];

// ── Fact-Checking / Verification sites
export const FACTCHECK_SOURCES = [
  { name: 'Snopes',           url: 'https://www.snopes.com/feed/',         domain: 'snopes.com',      category: 'Fact Check' },
  { name: 'PolitiFact',       url: 'https://www.politifact.com/rss/all/',  domain: 'politifact.com',  category: 'Fact Check' },
  { name: 'FactCheck.org',    url: 'https://www.factcheck.org/feed/',      domain: 'factcheck.org',   category: 'Fact Check' },
  { name: 'AFP Fact Check',   url: 'https://factcheck.afp.com/rss',        domain: 'factcheck.afp.com', category: 'Fact Check' },
  { name: 'Full Fact',        url: 'https://fullfact.org/feed/latest/',     domain: 'fullfact.org',    category: 'Fact Check' },
  { name: 'Lead Stories',     url: 'https://leadstories.com/atom.xml',     domain: 'leadstories.com', category: 'Fact Check' },
];

// ── Low-credibility / misinformation-prone sources
export const MISINFORMATION_SOURCES = [
  { name: 'RT (Russia Today)', url: 'https://www.rt.com/rss/',              domain: 'rt.com',          category: 'State Media' },
  { name: 'Daily Mail',        url: 'https://www.dailymail.co.uk/articles.rss', domain: 'dailymail.co.uk', category: 'Tabloid' },
  { name: 'NY Post',           url: 'https://nypost.com/feed/',             domain: 'nypost.com',      category: 'Tabloid' },
  { name: 'Zero Hedge',        url: 'https://feeds.feedburner.com/zerohedge/feed', domain: 'zerohedge.com', category: 'Alt-Media' },
];

// ── Reddit subreddits
const REDDIT_NEWS_SUBS    = ['worldnews', 'news', 'politics', 'science', 'technology', 'UpliftingNews'];
const REDDIT_MISINFO_SUBS = ['conspiracy', 'conspiracytheories', 'Disinfo'];

// ── Nitter instances (Twitter/X mirror — public, no API key)
const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.1d4.us',
];
const NITTER_ACCOUNTS = [
  'BBCBreaking', 'Reuters', 'AP', 'CNN', 'nytimes',
  'WHO', 'CDCgov', 'PolitiFactTruth', 'Snopes',
];

interface Rss2JsonItem {
  title: string; link: string; description: string; pubDate: string;
  enclosure?: { link: string }; thumbnail?: string;
}
interface Rss2JsonResponse {
  status: string;
  feed: { title: string; link: string; image: string };
  items: Rss2JsonItem[];
}

export function cleanHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim().slice(0, 300);
}

// Shared fetch with timeout and single retry
async function fetchRSS(url: string, timeoutMs = 8000): Promise<Rss2JsonResponse | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${RSS2JSON}${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;
      const data: Rss2JsonResponse = await res.json();
      if (data.status === 'ok' && data.items?.length > 0) return data;
    } catch { /* retry */ }
  }
  return null;
}

async function parseSource(
  source: { name: string; url: string; domain: string; category: string }
): Promise<NewsItem[]> {
  const data = await fetchRSS(source.url);
  if (!data) return [];
  return data.items.slice(0, 5).map((item, idx) => ({
    id: `${source.domain}-${idx}-${Date.now()}`,
    title: cleanHtml(item.title) || 'Untitled',
    description: cleanHtml(item.description || ''),
    link: item.link || '#',
    pubDate: item.pubDate || new Date().toISOString(),
    source: source.name,
    sourceDomain: source.domain,
    category: source.category,
    platform: 'RSS',
    imageUrl: item.thumbnail || item.enclosure?.link,
  }));
}

/** Fetch all mainstream RSS in parallel (with concurrency cap of 5) */
export async function fetchAllNews(limit = 30): Promise<NewsItem[]> {
  const results = await Promise.allSettled(RSS_SOURCES.map((s) => parseSource(s)));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  const seen = new Set<string>();
  return all
    .filter((item) => {
      const key = item.title.slice(0, 35).toLowerCase();
      if (seen.has(key) || key.length < 5) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** Fetch misinformation-prone sources */
export async function fetchMisinformationSources(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(MISINFORMATION_SOURCES.map((s) => parseSource(s)));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

/** Fetch fact-checking feeds */
export async function fetchFactCheckNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(FACTCHECK_SOURCES.map((s) => parseSource(s)));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

/** Fetch a single Reddit subreddit */
async function fetchSubreddit(sub: string): Promise<RedditPost[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data?.children || []).map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      url: child.data.url,
      score: child.data.score,
      numComments: child.data.num_comments,
      subreddit: child.data.subreddit,
      permalink: `https://reddit.com${child.data.permalink}`,
      createdUtc: child.data.created_utc,
    }));
  } catch { return []; }
}

/** Fetch a mix of Reddit posts (news + conspiracy) */
export async function fetchRedditTrending(includeConspiracy = true): Promise<RedditPost[]> {
  const subs = includeConspiracy
    ? [...REDDIT_NEWS_SUBS.slice(0, 3), ...REDDIT_MISINFO_SUBS.slice(0, 2)]
    : REDDIT_NEWS_SUBS;
  const idx = Math.floor(Math.random() * subs.length);
  return fetchSubreddit(subs[idx]);
}

/** Fetch all Reddit subs in parallel (for Social Platform page) */
export async function fetchAllRedditSubs(): Promise<{ sub: string; posts: RedditPost[] }[]> {
  const allSubs = [...REDDIT_NEWS_SUBS, ...REDDIT_MISINFO_SUBS];
  const results = await Promise.allSettled(
    allSubs.map(async (sub) => ({ sub, posts: await fetchSubreddit(sub) }))
  );
  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<{ sub: string; posts: RedditPost[] }>).value);
}

/** Fetch HackerNews top stories */
export async function fetchHackerNews(limit = 10): Promise<SocialPost[]> {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const ids: number[] = await res.json();
    const topIds = ids.slice(0, limit);
    const stories = await Promise.allSettled(
      topIds.map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(4000),
        });
        return r.json();
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stories.filter((s) => s.status === 'fulfilled').map((s: any) => ({
      id: String(s.value.id),
      title: s.value.title || 'Untitled',
      link: s.value.url || `https://news.ycombinator.com/item?id=${s.value.id}`,
      source: 'Hacker News',
      platform: 'HackerNews',
      score: s.value.score,
      time: new Date(s.value.time * 1000).toLocaleTimeString(),
    }));
  } catch { return []; }
}

/** Fetch Mastodon public timeline */
export async function fetchMastodon(limit = 10): Promise<SocialPost[]> {
  try {
    const res = await fetch(
      'https://mastodon.social/api/v1/timelines/public?limit=20&local=false',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];
    const posts = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return posts
      .filter((p: any) => p.content && p.url && p.language !== 'ja')
      .slice(0, limit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any, i: number) => ({
        id: String(p.id ?? i),
        title: cleanHtml(p.content || '').slice(0, 140) || 'Mastodon post',
        link: p.url,
        source: `@${p.account?.acct ?? 'mastodon'}`,
        platform: 'Mastodon',
        time: new Date(p.created_at).toLocaleTimeString(),
      }));
  } catch { return []; }
}

/** Fetch Twitter/X via Nitter RSS mirrors (no API key) */
export async function fetchNitterFeed(limit = 8): Promise<SocialPost[]> {
  // Pick a random Nitter instance and a random influential account
  const instance = NITTER_INSTANCES[Math.floor(Math.random() * NITTER_INSTANCES.length)];
  const account  = NITTER_ACCOUNTS[Math.floor(Math.random() * NITTER_ACCOUNTS.length)];
  try {
    const data = await fetchRSS(`${instance}/${account}/rss`, 6000);
    if (!data) return [];
    return data.items.slice(0, limit).map((item, i) => ({
      id: `nitter-${account}-${i}`,
      title: cleanHtml(item.title || item.description || '').slice(0, 160),
      link: item.link,
      source: `@${account} (Twitter/X)`,
      platform: 'Twitter/X',
      time: new Date(item.pubDate).toLocaleTimeString(),
    }));
  } catch { return []; }
}

/** Fetch YouTube trending via Invidious API (no API key) */
export async function fetchYouTubeTrending(limit = 6): Promise<SocialPost[]> {
  // Invidious is an open-source YouTube frontend with a public JSON API
  const INVIDIOUS_INSTANCES = [
    'https://inv.nadeko.net',
    'https://invidious.privacydev.net',
    'https://invidious.fdn.fr',
  ];
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/v1/trending?region=US&type=news`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const videos = await res.json();
      if (!Array.isArray(videos) || videos.length === 0) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return videos.slice(0, limit).map((v: any, i: number) => ({
        id: v.videoId ?? `yt-${i}`,
        title: v.title ?? 'YouTube Video',
        link: `https://youtube.com/watch?v=${v.videoId}`,
        source: v.author ?? 'YouTube',
        platform: 'YouTube',
        time: v.publishedText ?? 'recent',
      }));
    } catch { /* try next */ }
  }
  return [];
}

/** Fetch Telegram public channel posts via RSS bridge */
export async function fetchTelegramChannels(limit = 8): Promise<SocialPost[]> {
  // Public Telegram channels that often spread misinformation/news
  const TELEGRAM_RSS_CHANNELS = [
    { channel: 'bbcnews',    url: 'https://rsshub.app/telegram/channel/bbcnews' },
    { channel: 'reuters_news', url: 'https://rsshub.app/telegram/channel/reuters_news' },
    { channel: 'disclosetv', url: 'https://rsshub.app/telegram/channel/disclosetv' },
  ];
  const source = TELEGRAM_RSS_CHANNELS[Math.floor(Math.random() * TELEGRAM_RSS_CHANNELS.length)];
  try {
    const data = await fetchRSS(source.url, 6000);
    if (!data) return [];
    return data.items.slice(0, limit).map((item, i) => ({
      id: `tg-${source.channel}-${i}`,
      title: cleanHtml(item.title || item.description || '').slice(0, 160),
      link: item.link,
      source: `Telegram: ${source.channel}`,
      platform: 'Telegram',
      time: new Date(item.pubDate).toLocaleTimeString(),
    }));
  } catch { return []; }
}

/** Fetch all social platforms in parallel */
export async function fetchAllSocialPlatforms(): Promise<{
  reddit: RedditPost[];
  hackerNews: SocialPost[];
  mastodon: SocialPost[];
  twitter: SocialPost[];
  youtube: SocialPost[];
  telegram: SocialPost[];
}> {
  const [reddit, hackerNews, mastodon, twitter, youtube, telegram] = await Promise.allSettled([
    fetchRedditTrending(true),
    fetchHackerNews(8),
    fetchMastodon(8),
    fetchNitterFeed(6),
    fetchYouTubeTrending(5),
    fetchTelegramChannels(5),
  ]);
  return {
    reddit:     reddit.status     === 'fulfilled' ? reddit.value     : [],
    hackerNews: hackerNews.status === 'fulfilled' ? hackerNews.value : [],
    mastodon:   mastodon.status   === 'fulfilled' ? mastodon.value   : [],
    twitter:    twitter.status    === 'fulfilled' ? twitter.value    : [],
    youtube:    youtube.status    === 'fulfilled' ? youtube.value    : [],
    telegram:   telegram.status   === 'fulfilled' ? telegram.value   : [],
  };
}

// ─────────────────────────────────────────────────────────────
// GOOGLE TRENDS — 4 fallback strategies
// ─────────────────────────────────────────────────────────────
const GOOGLE_TRENDS_URLS = [
  'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US',
  'https://trends.google.com/trends/trendingsearches/daily/rss?geo=GB',
  'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN',
];

const FALLBACK_TRENDS: TrendItem[] = [
  'Breaking News', 'Fact Check Today', 'Climate Change', 'AI Technology',
  'Election Results', 'Misinformation Alert', 'Social Media Hoax', 'Deep Fake Video',
  'Vaccine Update', 'Economy News', 'War Reports', 'Health Advisory',
  'UFO Disclosure', 'Crypto Crash', 'Political Scandal', 'Natural Disaster',
].map((keyword, rank) => ({ keyword, source: 'InfoShield Trending (cached)', rank }));

export async function fetchGoogleTrends(): Promise<TrendItem[]> {
  // Strategy 1 & 2: Try multiple geo Google Trends RSS feeds
  for (const url of GOOGLE_TRENDS_URLS) {
    try {
      const data = await fetchRSS(url, 7000);
      if (data && data.items.length > 0) {
        return data.items.slice(0, 15).map((item, rank) => ({
          keyword: cleanHtml(item.title),
          source: 'Google Trends',
          rank,
        }));
      }
    } catch { /* try next */ }
  }
  // Strategy 3: HackerNews as trending proxy
  try {
    const hn = await fetchHackerNews(15);
    if (hn.length > 0) {
      return hn.map((item, rank) => ({
        keyword: item.title.slice(0, 70),
        source: 'HackerNews Trending',
        rank,
      }));
    }
  } catch { /* fallback */ }
  // Strategy 4: Cached fallback
  return FALLBACK_TRENDS;
}

export async function fetchNewsFromSource(
  source: typeof RSS_SOURCES[number]
): Promise<NewsItem[]> {
  return parseSource(source);
}
