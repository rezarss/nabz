const { authenticate, sendJson, getHistoryData } = require('../../_lib');

module.exports = async function handler(req, res) {
  if (!authenticate(req, res)) return;
  const symbol = String(req.query.symbol || '').toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(symbol)) {
    return sendJson(res, 400, { success: false, error: 'INVALID_SYMBOL' });
  }
  try {
    const data = await getHistoryData(symbol);
    if (!data) return sendJson(res, 404, { success: false, error: 'SYMBOL_NOT_FOUND', symbol });
    return sendJson(res, 200, { success: true, data, meta: { symbol, updatedAt: data.updated_at || null, source: 'nabz' } });
  } catch (error) {
    console.error('[nabz-api] history upstream error:', error.message);
    return sendJson(res, 502, { success: false, error: 'UPSTREAM_UNAVAILABLE' });
  }
};
