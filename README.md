# nodeway

A research map for anything you're curious about — instead of Instagram.

Type a topic (or hit "surprise me" from 180+ topics spanning law, economics,
physics, biology, philosophy, engineering, and more) and get a full dossier:

- **AI Summary** — a sharp, non-encyclopedic overview. Uses your own Anthropic
  API key if you add one (Settings); falls back to the Wikipedia extract if
  you don't. Clearly badged either way, so you always know which you're reading.
- **Visuals** — real images pulled live from Wikipedia + Openverse (CC-licensed).
- **Primary Sources** — real papers pulled live from CrossRef (broad coverage
  across every discipline, not just STEM) and Semantic Scholar.
- **Explore Next** — related topics pulled from Wikipedia's related-pages API,
  click any one to jump straight into a new dossier. This is your recommendation
  engine — the ResearchRabbit-style "keep pulling the thread."
- **The Path** — the 5-step framework for going from zero to competent in a
  niche, tucked behind its own button so it doesn't clutter the main view.
- **The Catalogue** — every topic you've opened, logged locally in your browser.

No backend, no build step. Runs as static files. The only optional external
dependency is your own Anthropic API key, stored only in your browser.

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
web page with normal network access, and the live API calls work.

## Turning on AI Summary

1. Click the gear icon (Settings).
2. Paste an Anthropic API key — get one free at console.anthropic.com (pay-as-you-go,
   pennies per summary on Haiku).
3. Save. The key is stored in `localStorage` only, never sent anywhere except
   directly from your browser to `api.anthropic.com`.
4. Without a key, you still get the Wikipedia extract, clearly labeled, with a
   nudge to add a key.

This calls the API directly from the browser using the
`anthropic-dangerous-direct-browser-access` header — normal for a personal,
client-side-only tool like this. Don't publish your key anywhere; it lives
only in your own browser's storage.

## How it works

- `js/topics.js` — curated shelf of topics for "surprise me," each tagged with
  a field, used for the field label under the dossier title.
- `js/app.js` — all the fetch logic:
  - `fetchWikipediaSummary` — opensearch to resolve the best-matching title,
    then the REST summary endpoint for the extract + thumbnail.
  - `fetchAiSummary` — optional, calls `api.anthropic.com/v1/messages` with
    your stored key.
  - `fetchOpenverseImages` — CC-licensed images, no key needed.
  - `fetchCrossref` + `fetchSemanticScholar` — merged and deduped paper
    results, both free, both keyless.
  - `fetchRelatedTopics` — Wikipedia's related-pages endpoint, powers "Explore Next."
  - Catalogue + API key both persist in `localStorage`, nothing else leaves
    your browser.

## Roadmap (not built yet)

- **Dynamic mind map** — a node graph (topics as nodes, "explored →
  recommended" as edges) that grows as you catalogue more topics, closer to
  ResearchRabbit's actual citation-graph visualization. This is a real chunk
  of work (a graph library, a layout algorithm, persistence) — worth its own
  pass once the linear flow above feels solid.
- Author/practitioner panel via Semantic Scholar's author endpoint, sorted by
  recent activity.
- Export the catalogue as markdown notes.
- Search-bar autocomplete against the topic shelf as you type.
