# Field Log

A working notebook for going deep on any topic — instead of Instagram.

Pick a topic (or hit "Surprise me" for a random one from 180+ topics spanning
law, economics, physics, biology, philosophy, engineering, and more) and get:

- **A primer** — pulled live from Wikipedia, so you get oriented in 30 seconds.
- **A path to depth** — the 5-step framework for actually becoming competent
  in a niche (map the terrain → find the 20% that repeats → read primary
  sources → find who's active now → write it in your own words).
- **Primary sources** — real papers pulled live from arXiv and Semantic
  Scholar, so you're reading peer-reviewed material, not blog summaries.
- **A catalogue** — every topic you've opened gets logged locally in your
  browser, so you can see your own trail over time.

No build step. No backend. No API keys. Runs entirely in the browser.

## Run it

Just open `index.html` in a browser, or serve the folder statically:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy it free (GitHub Pages)

1. Push this repo to GitHub.
2. Repo Settings → Pages → Source: `main` branch, root folder.
3. Your tool is live at `https://<your-username>.github.io/<repo-name>/`.

## How it works

- `js/topics.js` — curated shelf of topics for the random picker.
- `js/app.js` — fetches a Wikipedia summary (opensearch + REST summary API),
  arXiv results (Atom XML via the public arXiv API), and Semantic Scholar
  results (Graph API), then renders them. Catalogue history is stored in
  `localStorage`, nothing leaves your browser except the API calls above.

All three APIs used (Wikipedia, arXiv, Semantic Scholar) are free, public,
and require no API key.

## Extend it

Ideas worth building next, in rough order of leverage:
- Swap the static 5-step path for one generated per-topic via an LLM call
  (would need a backend or a client-supplied API key — currently kept
  key-free on purpose so it stays a zero-cost, zero-setup tool).
- Add a "practitioners to follow" panel using Semantic Scholar's author
  endpoint, sorted by recent publication activity.
- Export the catalogue as markdown notes.
