# Explora

Discover local businesses, earn points, and unlock rewards.

## Setup (API keys – not in repo)

Keys are not committed. Create `config.js` from the example and add your keys:

```bash
cp config.example.js config.js
```

Edit `config.js` and set:

- `window.EXPLORA_GMAPS_KEY` – Google Maps JavaScript API key (Maps + Places).
- `window.EXPLORA_GEMINI_KEY` – Google Gemini API key (for the in-app chatbot).

`config.js` is in `.gitignore` so it will not be pushed to the repo.

## Run the app (chatbot works)

The Gemini API does not allow direct calls from the browser (CORS). Use the included proxy server:

1. Start the server:
   ```bash
   node server.js
   ```
2. Open in the browser:
   ```
   http://localhost:3131
   ```

Optional: set `GEMINI_API_KEY` in your environment so the server uses it for the proxy instead of the client key.

## Run without the server

Open `index.html` directly. The map works if `EXPLORA_GMAPS_KEY` is set in `config.js`. The chatbot will fail without the server (CORS) unless you run `node server.js` and use `http://localhost:3131`.
