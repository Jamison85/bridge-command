# Store Pilot AI API Bridge

This folder contains a Cloudflare Worker that safely connects Store Pilot to the Gemini API.

The Store Pilot web app should never contain a Gemini API key. The key belongs in Cloudflare as a secret. The app calls the Worker URL, and the Worker calls Gemini.

## Files

- `store-pilot-ai-worker.js` - Cloudflare Worker source
- `wrangler.toml.example` - example Worker config

## Setup

1. Create a Gemini API key in Google AI Studio.
2. Create a new Cloudflare Worker.
3. Copy `store-pilot-ai-worker.js` into the Worker.
4. Add a secret named `GEMINI_API_KEY`.
5. Deploy the Worker.
6. Copy the Worker URL.
7. In Store Pilot, open Log > Smart Shift Brain > Set API Endpoint.
8. Paste the Worker URL.

## Wrangler setup

If using Wrangler locally:

```bash
cd cloudflare-worker
cp wrangler.toml.example wrangler.toml
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

Cloudflare will ask you to paste the Gemini API key when you run the secret command.

## Expected app request

Store Pilot sends JSON with:

- `prefs`
- `review`
- `brain`
- `currentMessage`
- `instruction`

## Expected Worker response

The Worker returns JSON like:

```json
{
  "message": "Hi Loretta, here is where the shift landed...",
  "storeStatus": "Yellow",
  "recommendedNext": "Open-air cooler dates",
  "why": "Recommended because it is freshness-related and still open.",
  "provider": "gemini",
  "model": "gemini-3.5-flash"
}
```

If the Worker or Gemini fails, Store Pilot falls back to the local Shift Brain.

## Security note

Do not paste a Gemini API key into Store Pilot. Only paste the Cloudflare Worker URL into Store Pilot.
