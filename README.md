# nodeway

A research map for anything you're curious about — instead of Instagram.

Type a topic (or hover "surprise me" for 5 random suggestions, or click it for
one fully random pick from 180+ topics spanning law, economics, physics,
biology, philosophy, engineering, and more) and get a full dossier:

- **AI Summary** — a sharp, non-encyclopedic overview. Bring your own key from
  **Anthropic (Claude)** or **Google AI Studio (Gemini, free tier)** — pick
  either in Settings. Falls back to the Wikipedia extract if you don't set one,
  clearly badged either way.
- **Visuals** — real images pulled live from Wikipedia + Openverse (CC-licensed).
- **Primary Sources** — real papers pulled live from CrossRef (broad coverage
  across every discipline, not just STEM) and Semantic Scholar.
- **Explore Next** — related topics pulled from Wikipedia's related-pages API,
  click any one to jump straight into a new dossier.
- **Mind Map** — every topic you open becomes a node (teal = explored), every
  related topic becomes a suggested node (indigo = not explored yet), connected
  by edges. It's a live, interactive force-directed graph — drag nodes, zoom,
  click any node to open that dossier. This is your visual "what to explore
  next," built automatically as you go, no manual setup.
- **The Path** — the 5-step framework for going from zero to competent in a
  niche, tucked behind its own button.
- **The Catalogue** — every topic you've opened, logged locally in your browser.

No backend, no build step. Runs as static files. The only optional external
dependency is your own AI provider key, stored only in your browser.

## Run it

Open `index.html` directly, or serve it statically:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy it free (GitHub Pages)

1. Push this repo to GitHub.
2. Repo Settings → Pages → Source: `main` branch, root folder.
3. Live at `https://<your-username>.github.io/<repo-name>/`.

**Important:** test on the deployed GitHub Pages URL, not just by opening the
file locally or previewing inside a sandboxed environment. `file://` origins
and some sandboxed iframes (including Claude's own in-chat preview) block or
restrict cross-origin fetches, so the papers/images panels can look broken
there even though the code is correct. Once it's on GitHub Pages it's a normal
web page with normal network access.

## Turning on AI Summary

1. Click the gear icon (Settings).
2. Pick a provider:
   - **Anthropic (Claude)** — get a key at console.anthropic.com. Pay-as-you-go,
     pennies per summary on the default model (Haiku).
   - **Google AI Studio (Gemini)** — get a free key at aistudio.google.com/apikey.
     Gemini's free tier comfortably covers this kind of light use.
3. Paste the key, adjust the model name if you want a different one (defaults
   are pre-filled and editable — if either provider renames its models later,
   just update the field here, no code change needed).
4. Save. The key is stored in `localStorage` only, sent nowhere except directly
   from your browser to that provider's API.

Both calls go straight from the browser to the provider (Anthropic via the
`anthropic-dangerous-direct-browser-access` header, Gemini via `x-goog-api-key`)
— normal for a personal, client-side-only tool like this. Don't publish your
key anywhere; it lives only in your own browser's storage.

## How it works

- `js/topics.js` — curated shelf of topics for "surprise me" and the search
  typeahead, each tagged with a field.
- `js/app.js` — all the fetch logic (Wikipedia, AI summary, Openverse, CrossRef,
  Semantic Scholar, related topics), plus the search suggestions dropdown and
  the surprise-me hover popover. Catalogue + AI settings persist in `localStorage`.
- `js/mindmap.js` — a self-contained module. Owns its own `nodeway.graph`
  localStorage key, and renders it with D3 (`forceSimulation` + drag + zoom)
  into the fullscreen map overlay. Exposes `window.NodewayMap` with
  `addExplored`, `addSuggested`, `open`, `close`, `clearGraph` — `app.js` calls
  into it after every search, `mindmap.js` calls back into `app.js`'s
  `openDossier` when you click a node.
- D3 is loaded from cdnjs (no install step, no bundler).

## Roadmap (not built yet)

- Author/practitioner panel via Semantic Scholar's author endpoint, sorted by
  recent activity.
- Export the catalogue (or the mind map) as markdown notes.
- Field-based node coloring in the mind map (right now it's purely
  explored-vs-suggested; could also color by discipline).
