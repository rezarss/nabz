const { authenticate, sendJson, getMarketData } = require('../_lib');

module.exports = async function handler(req, res) {
  if (!authenticate(req, res)) return;
  try {
    const data = await getMarketData();
    return sendJson(res, 200, { success: true, data, meta: { updatedAt: data.updated_at || null, source: 'nabz' } });
  } catch (error) {
    console.error('[nabz-api] market upstream error:', error.message);
    return sendJson(res, 502, { success: false, error: 'UPSTREAM_UNAVAILABLE' });
  }
};
