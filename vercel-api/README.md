# Nabz API

Authenticated, read-only API backed by the JSON data generated in [rezarss/nabz](https://github.com/rezarss/nabz).

## Base URL

`https://nabz-api.vercel.app/api/v1`

## Authentication

Send the API key in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

Do not put a key in a browser bundle or public website JavaScript. Keep it on your server. Electron applications can call the API from the main process; a key shipped inside an installer can be extracted and should be treated as a revocable application credential, not a secret.

## Endpoints

- `GET /market` — all current prices and update metadata.
- `GET /symbols` — available market symbols and current values.
- `GET /history/:symbol` — history for a symbol, e.g. `/history/usd`, `/history/gold_18k`, `/history/coin_emami`.
- `GET /health` — public service health check.

Successful responses use `{ "success": true, "data": ..., "meta": ... }`.

## Limits and caching

- 120 requests per minute per key per warm serverless instance (best-effort; not a globally coordinated quota).
- Upstream JSON is cached in memory for 30 seconds per function instance.
- Responses are private-cacheable for 20 seconds; no shared CDN cache is used for authenticated data.
- Read-only endpoints only. No write operations.

## Environment

Set `API_KEYS` in Vercel to a comma-separated list of active keys. Rotate a key by updating this variable and redeploying.
