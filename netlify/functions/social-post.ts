/**
 * netlify/functions/social-post.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Real Social Media Posting Function
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Supports: Twitter/X  (v2 API, OAuth 1.0a)
 *           Facebook   (Graph API, Page Access Token)
 *           LinkedIn   (UGC Posts API, OAuth 2.0 token)
 *
 * SETUP (Netlify Dashboard → Site → Environment Variables):
 *
 *   TWITTER_API_KEY            — from developer.twitter.com → App → Keys
 *   TWITTER_API_SECRET         — from developer.twitter.com → App → Keys
 *   TWITTER_ACCESS_TOKEN       — from developer.twitter.com → App → Tokens
 *   TWITTER_ACCESS_TOKEN_SECRET— from developer.twitter.com → App → Tokens
 *
 *   FACEBOOK_PAGE_ID           — numeric Facebook Page ID (not username)
 *   FACEBOOK_PAGE_TOKEN        — Long-lived Page Access Token from Graph API explorer
 *
 *   LINKEDIN_ACCESS_TOKEN      — OAuth 2.0 token with w_member_social permission
 *   LINKEDIN_PERSON_URN        — your LinkedIn person URN e.g. urn:li:person:XXXXXXX
 *
 * AUTO-DEPLOY:  This file is bundled by Netlify → /.netlify/functions/social-post
 * LOCAL DEV:    netlify dev  (or: netlify functions:serve --port 8888)
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PostRequest {
  platform: 'twitter' | 'facebook' | 'linkedin';
  text: string;
}

interface PostResult {
  success: boolean;
  platform: string;
  postId?: string;
  url?: string;
  error?: string;
}

// ─── CORS Helper ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ─────────────────────────────────────────────────────────────────────────────
// TWITTER / X  — OAuth 1.0a tweet creation
// POST https://api.twitter.com/2/tweets
// ─────────────────────────────────────────────────────────────────────────────
function oauthHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  apiKey: string,
  apiSecret: string,
  token: string,
  tokenSecret: string,
): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     apiKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            token,
    oauth_version:          '1.0',
  };

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramStr = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const sigBaseStr = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramStr),
  ].join('&');

  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(tokenSecret)}`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(sigBaseStr)
    .digest('base64');

  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

async function postToTwitter(text: string): Promise<PostResult> {
  const {
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_TOKEN_SECRET,
  } = process.env;

  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
    return { success: false, platform: 'twitter', error: 'Twitter credentials not configured in environment variables.' };
  }

  const tweetText = text.slice(0, 280); // Enforce 280 char limit
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text: tweetText });

  const authHeader = oauthHeader(
    'POST', url, {}, // body params go in body not in signature for JSON requests
    TWITTER_API_KEY, TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET,
  );

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await res.json() as { data?: { id: string }; errors?: { message: string }[] };

    if (!res.ok || data.errors) {
      const msg = data.errors?.[0]?.message ?? `HTTP ${res.status}`;
      return { success: false, platform: 'twitter', error: `Twitter API: ${msg}` };
    }

    const tweetId = data.data?.id ?? '';
    return {
      success: true,
      platform: 'twitter',
      postId: tweetId,
      url: `https://twitter.com/i/web/status/${tweetId}`,
    };
  } catch (err) {
    return { success: false, platform: 'twitter', error: `Network error: ${String(err)}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK  — Graph API Page Post
// POST https://graph.facebook.com/{page-id}/feed
// ─────────────────────────────────────────────────────────────────────────────
async function postToFacebook(text: string): Promise<PostResult> {
  const { FACEBOOK_PAGE_ID, FACEBOOK_PAGE_TOKEN } = process.env;

  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_TOKEN) {
    return { success: false, platform: 'facebook', error: 'Facebook credentials not configured in environment variables.' };
  }

  const url = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        access_token: FACEBOOK_PAGE_TOKEN,
      }),
    });

    const data = await res.json() as { id?: string; error?: { message: string } };

    if (!res.ok || data.error) {
      return { success: false, platform: 'facebook', error: `Facebook API: ${data.error?.message ?? `HTTP ${res.status}`}` };
    }

    const postId = data.id ?? '';
    // Facebook post URL format: https://www.facebook.com/{page-id}/posts/{post-id-suffix}
    const postSuffix = postId.split('_')[1] ?? postId;
    return {
      success: true,
      platform: 'facebook',
      postId,
      url: `https://www.facebook.com/${FACEBOOK_PAGE_ID}/posts/${postSuffix}`,
    };
  } catch (err) {
    return { success: false, platform: 'facebook', error: `Network error: ${String(err)}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LINKEDIN  — UGC Posts API
// POST https://api.linkedin.com/v2/ugcPosts
// ─────────────────────────────────────────────────────────────────────────────
async function postToLinkedIn(text: string): Promise<PostResult> {
  const { LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN } = process.env;

  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
    return { success: false, platform: 'linkedin', error: 'LinkedIn credentials not configured in environment variables.' };
  }

  const url = 'https://api.linkedin.com/v2/ugcPosts';

  const postBody = {
    author: LINKEDIN_PERSON_URN,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    const data = await res.json() as { id?: string; message?: string; status?: number };

    if (!res.ok) {
      return { success: false, platform: 'linkedin', error: `LinkedIn API: ${data.message ?? `HTTP ${res.status}`}` };
    }

    const postId = data.id ?? '';
    return {
      success: true,
      platform: 'linkedin',
      postId,
      url: `https://www.linkedin.com/feed/update/${postId}/`,
    };
  } catch (err) {
    return { success: false, platform: 'linkedin', error: `Network error: ${String(err)}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let req: PostRequest;
  try {
    req = JSON.parse(event.body ?? '{}') as PostRequest;
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { platform, text } = req;

  if (!platform || !text?.trim()) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'platform and text are required' }) };
  }

  let result: PostResult;
  switch (platform) {
    case 'twitter':  result = await postToTwitter(text);  break;
    case 'facebook': result = await postToFacebook(text); break;
    case 'linkedin': result = await postToLinkedIn(text); break;
    default:
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: `Unknown platform: ${platform}` }) };
  }

  return {
    statusCode: result.success ? 200 : 502,
    headers: CORS_HEADERS,
    body: JSON.stringify(result),
  };
};
