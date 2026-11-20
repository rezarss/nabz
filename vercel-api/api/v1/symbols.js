const { authenticate, sendJson, getMarketData } = require('../_lib');

const META_KEYS = new Set(['updated_at', 'date', 'date_shamsi', 'date_shamsi_full', 'time', 'gold_ounce']);

module.exports = async function handler(req, res) {
  if (!authenticate(req, res)) return;
  try {
    const market = await getMarketData();
    const symbols = Object.keys(market)
      .filter((key) => !META_KEYS.has(key) && /^[a-z0-9_]+$/.test(key))
      .map((key) => ({ symbol: key, value: market[key] }));
    return sendJson(res, 200, { success: true, data: symbols, meta: { count: symbols.length, updatedAt: market.updated_at || null } });
  } catch (error) {
    console.error('[nabz-api] symbols upstream error:', error.message);
    return sendJson(res, 502, { success: false, error: 'UPSTREAM_UNAVAILABLE' });
  }
};
