const crypto = require('node:crypto');

const DATA_BASE = 'https://raw.githubusercontent.com/rezarss/nabz/main';
const rateBuckets = new Map();
const cache = new Map();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const CACHE_TTL_MS = 30_000;

function sendJson(res, status, body, extraHeaders = {}) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, max-age=20, stale-while-revalidate=30');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  return res.status(status).json(body);
}

function authenticate(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(204).end();
    return false;
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { success: false, error: 'METHOD_NOT_ALLOWED' }, { Allow: 'GET, OPTIONS' });
    return false;
  }

  const configured = (process.env.API_KEYS || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!configured.length) {
    sendJson(res, 503, { success: false, error: 'API_NOT_CONFIGURED' });
    return false;
  }

  const authorization = req.headers.authorization || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const valid = configured.some((key) => {
    const a = Buffer.from(key);
    const b = Buffer.from(supplied);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!valid) {
    sendJson(res, 401, { success: false, error: 'UNAUTHORIZED' });
    return false;
  }

  const now = Date.now();
  const bucket = rateBuckets.get(supplied);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(supplied, { startedAt: now, count: 1 });
  } else {
    bucket.count += 1;
    if (bucket.count > RATE_LIMIT) {
      const retryAfter = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - bucket.startedAt)) / 1000));
      sendJson(res, 429, { success: false, error: 'RATE_LIMIT_EXCEEDED', retryAfter }, { 'Retry-After': String(retryAfter) });
      return false;
    }
  }
  return true;
}

async function getMarketData() {
  const key = 'market';
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.data;

  const response = await fetch(DATA_BASE + '/market.json', {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('UPSTREAM_HTTP_' + response.status);
  const data = await response.json();
  cache.set(key, { time: Date.now(), data });
  return data;
}

async function getHistoryData(symbol) {
  const key = 'history:' + symbol;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.data;

  const response = await fetch(DATA_BASE + '/api/history_' + encodeURIComponent(symbol) + '.json', {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('UPSTREAM_HTTP_' + response.status);
  const data = await response.json();
  cache.set(key, { time: Date.now(), data });
  return data;
}

module.exports = { authenticate, sendJson, getMarketData, getHistoryData };
