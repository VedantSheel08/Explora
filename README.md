# Explora

**Turning exploration into a game.**

By **Vedant Sheel**, **Kush Dhussa**, and **Ishaan Dhingra**.

---

## What is Explora?

Explora is a Pokémon Go–inspired platform where visiting real locations earns you points and unlocks rewards. We connect users with local businesses, encourage in-person exploration, and give smaller brands a fair shot at discovery.

---

## The Problem

- Traditional platforms favor popularity and SEO, so smaller and newer businesses get little exposure.
- Small businesses struggle to get consistent visibility and foot traffic in competitive markets.
- Many fail due to low reach and discoverability—nearly **50% of small businesses fail within 5 years**.
- Even when platforms show locations, users often lack a real reason to go there and engage in person.

---

## The Solution

- **Gamified exploration** — Visit places, earn points, unlock rewards and badges.
- **Local-first discovery** — Prioritize what’s near you, not just what’s trending everywhere.
- **Higher exposure for small brands** — Surfaces hidden gems and evens the playing field.
- **Real-world motivation** — Rewards and challenges give users a reason to show up IRL.
- **Built for students and explorers** — Designed to get people out and involved in their community.

---

## Core Features

| Feature | Description |
|--------|--------------|
| **Interactive map** | Real-time map with clickable markers, filters, and business details. |
| **Trending & recommended** | See what’s popular and get suggestions based on your interests. |
| **Rewards & QR codes** | Earn points by visiting places; scan QR codes to claim rewards. |
| **User reviews** | Rate and review businesses to help others and shape recommendations. |
| **AI chatbot** | Ask in natural language for suggestions (e.g. “coffee near me”, “good pizza”). |
| **Light / dark theme** | Toggle for comfort in any environment. |
| **Store details, promos & benefits** | View info, deals, and rewards offered by each business. |
| **App-style navigation** | Bottom nav and layout optimized for mobile browsers. |

---

## How We Achieve This

- **Scalable growth** — Designed to expand across new cities and categories while staying fast and reliable.
- **Partnership model** — We earn a small share per transaction from partner businesses and return most of it to users as rewards (e.g. 1.5% from partners, up to 1.25% back to users).
- **Recurring revenue** — Premium listings, featured placements, and promotional partnerships support long-term sustainability.

---

## Technology & Code

| Area | Stack & approach |
|------|------------------|
| **Frontend (UI/UX)** | HTML, CSS, JavaScript. Responsive, map-based UI with filters, sorting, and saved locations. Optimized for mobile. |
| **Maps & location** | Google Maps API. GPS-based location, nearby businesses by real-time position, interactive markers, distance and category filters. |
| **AI & recommendations** | Google Gemini API. Natural-language chatbot, personalized suggestions from user + location data, and feedback-driven improvements. |

---

## Advantages & Limitations

**Advantages**

- Encourages real-world engagement and exploration.
- Increases visibility for small businesses.
- Secure system with user privacy in mind.
- Makes discovering new places easier and more engaging.
- Helps strengthen local economies.

**Limitations**

- Early on, limited data can affect recommendation accuracy.
- Currently web-based; a native app could better suit on-the-go use.

---

## Future Improvements

- **Expansion** — Partner with more local businesses to grow coverage and visibility.
- **Notification mode (future app)** — Real-time location and smart notifications for deals, events, and recommended stores.
- **Accessibility & inclusion** — Filters for dietary needs, wheelchair access, budget, and other personal needs so the platform works for everyone.

---

## Setup (API keys — not in repo)

Keys are not committed. Create `config.js` from the example and add your keys:

```bash
cp config.example.js config.js
```

Edit `config.js` and set:

- `window.EXPLORA_GMAPS_KEY` — Google Maps JavaScript API key (Maps + Places).
- `window.EXPLORA_GEMINI_KEY` — Google Gemini API key (for the in-app chatbot).

`config.js` is in `.gitignore` and will not be pushed.

---

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

---

## Run without the server

Open `index.html` directly. The map works if `EXPLORA_GMAPS_KEY` is set in `config.js`. The chatbot will not work without the server (CORS) unless you run `node server.js` and use `http://localhost:3131`.
