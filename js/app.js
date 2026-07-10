// ---------- State ----------
let currentTopic = null;
let currentField = "general";

// ---------- DOM refs ----------
const heroSection = document.getElementById("hero");
const dossierSection = document.getElementById("dossier");
const topicForm = document.getElementById("topicForm");
const topicInput = document.getElementById("topicInput");
const randomBtn = document.getElementById("randomBtn");
const suggestionList = document.getElementById("suggestionList");
const surpriseWrap = document.getElementById("surpriseWrap");
const surprisePopover = document.getElementById("surprisePopover");
const surpriseChips = document.getElementById("surpriseChips");

const dossierField = document.getElementById("dossierField");
const dossierTitle = document.getElementById("dossierTitle");
const newTopicBtn = document.getElementById("newTopicBtn");

const summaryHeading = document.getElementById("summaryHeading");
const summaryBadge = document.getElementById("summaryBadge");
const primerBody = document.getElementById("primerBody");
const imagesBody = document.getElementById("imagesBody");
const papersBody = document.getElementById("papersBody");
const relatedBody = document.getElementById("relatedBody");
const markReadBtn = document.getElementById("markReadBtn");

const pathToggle = document.getElementById("pathToggle");
const pathDrawer = document.getElementById("pathDrawer");
const closePathDrawer = document.getElementById("closePathDrawer");

const historyToggle = document.getElementById("historyToggle");
const historyDrawer = document.getElementById("historyDrawer");
const closeHistoryDrawer = document.getElementById("closeHistoryDrawer");
const historyCount = document.getElementById("historyCount");
const historyList = document.getElementById("historyList");

const settingsToggle = document.getElementById("settingsToggle");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettings = document.getElementById("closeSettings");
const providerSelect = document.getElementById("providerSelect");
const apiKeyInput = document.getElementById("apiKeyInput");
const modelInput = document.getElementById("modelInput");
const providerHint = document.getElementById("providerHint");
const saveApiKey = document.getElementById("saveApiKey");
const clearApiKey = document.getElementById("clearApiKey");

const scrim = document.getElementById("scrim");

// default model per provider — editable by the user in Settings if these drift
const PROVIDER_DEFAULTS = {
  anthropic: { model: "claude-haiku-4-5-20251001", keyHelp: "Get a key at console.anthropic.com. Paid, pay-as-you-go — pennies per summary on Haiku." },
  gemini: { model: "gemini-2.5-flash", keyHelp: "Get a free key at aistudio.google.com/apikey. Gemini's free tier covers this kind of use easily." },
  none: { model: "", keyHelp: "" },
};

// ---------- Utilities ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n).trim() + "…" : str;
}

// ---------- AI provider settings storage ----------
const SETTINGS_STORAGE = "nodeway.aiSettings";
function getAiSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_STORAGE));
    if (raw && raw.provider) return raw;
  } catch {}
  return { provider: "none", apiKey: "", model: "" };
}
function setAiSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(settings));
}
function clearAiSettings() {
  localStorage.removeItem(SETTINGS_STORAGE);
}

// ---------- Catalogue (localStorage) ----------
const STORAGE_KEY = "fieldlog.catalogue";
function getCatalogue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveToCatalogue(topic, field) {
  const cat = getCatalogue();
  cat.unshift({ topic, field, date: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cat.slice(0, 200)));
  renderCatalogue();
}
function renderCatalogue() {
  const cat = getCatalogue();
  historyCount.textContent = cat.length;
  historyList.innerHTML = "";
  if (cat.length === 0) {
    historyList.innerHTML = `<li class="drawer-empty">Nothing catalogued yet.</li>`;
    return;
  }
  cat.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "drawer-item";
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    li.innerHTML = `<span class="drawer-item-title">${escapeHtml(entry.topic)}</span><span class="drawer-item-date">${dateStr}</span>`;
    li.addEventListener("click", () => {
      toggleDrawer(historyDrawer, false);
      topicInput.value = entry.topic;
      openDossier(entry.topic);
    });
    historyList.appendChild(li);
  });
}

// ---------- Wikipedia (fallback summary + images) ----------
async function fetchWikipediaSummary(topic) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&namespace=0&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const title = (searchData[1] && searchData[1][0]) || topic;

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(summaryUrl);
    if (!res.ok) throw new Error("no summary");
    const data = await res.json();
    return {
      title: data.title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page || null,
      thumbnail: data.thumbnail?.source || data.originalimage?.source || null,
    };
  } catch (err) {
    return null;
  }
}

async function fetchRelatedTopics(wikiTitle) {
  if (!wikiTitle) return [];
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(wikiTitle)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("no related");
    const data = await res.json();
    return (data.pages || []).slice(0, 8).map((p) => p.title);
  } catch (err) {
    return [];
  }
}

// ---------- AI summary (optional, needs the user's own API key) ----------
const AI_PROMPT = (topic) =>
  `Give a sharp, concrete 2-paragraph primer on "${topic}" for someone starting to go deep on it. First paragraph: what it actually is and why it matters. Second paragraph: the 2-3 central tensions or open questions in the field right now. Plain language, no fluff, no "in conclusion." Do not use markdown headers.`;

async function fetchAiSummaryAnthropic(topic, key, model) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || PROVIDER_DEFAULTS.anthropic.model,
      max_tokens: 400,
      messages: [{ role: "user", content: AI_PROMPT(topic) }],
    }),
  });
  if (!res.ok) throw new Error("anthropic api error " + res.status);
  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");
}

async function fetchAiSummaryGemini(topic, key, model) {
  const m = model || PROVIDER_DEFAULTS.gemini.model;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: AI_PROMPT(topic) }] }],
      }),
    }
  );
  if (!res.ok) throw new Error("gemini api error " + res.status);
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("\n\n");
}

async function fetchAiSummary(topic) {
  const settings = getAiSettings();
  if (!settings.provider || settings.provider === "none" || !settings.apiKey) return null;
  try {
    let text;
    if (settings.provider === "anthropic") {
      text = await fetchAiSummaryAnthropic(topic, settings.apiKey, settings.model);
    } else if (settings.provider === "gemini") {
      text = await fetchAiSummaryGemini(topic, settings.apiKey, settings.model);
    } else {
      return null;
    }
    return text || null;
  } catch (err) {
    return null;
  }
}

// ---------- Images (Wikipedia thumbnail + Openverse) ----------
async function fetchOpenverseImages(topic) {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(topic)}&page_size=3&license_type=all`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("openverse error");
    const data = await res.json();
    return (data.results || [])
      .filter((r) => r.thumbnail || r.url)
      .slice(0, 3)
      .map((r) => ({
        thumb: r.thumbnail || r.url,
        page: r.foreign_landing_url || r.url,
        credit: r.creator || r.source || "",
      }));
  } catch (err) {
    return [];
  }
}

// ---------- Papers: CrossRef (primary, broad coverage) + Semantic Scholar (secondary) ----------
async function fetchCrossref(topic) {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(topic)}&rows=5&sort=relevance`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("crossref error");
    const data = await res.json();
    const items = data.message?.items || [];
    return items
      .filter((it) => it.title && it.title[0])
      .map((it) => ({
        source: "CrossRef",
        title: it.title[0],
        abstract: it.abstract ? it.abstract.replace(/<[^>]+>/g, "") : "",
        url: it.URL,
        year: it["published-print"]?.["date-parts"]?.[0]?.[0] || it["published-online"]?.["date-parts"]?.[0]?.[0] || "",
        venue: it["container-title"]?.[0] || "",
        citations: it["is-referenced-by-count"],
      }));
  } catch (err) {
    return [];
  }
}

async function fetchSemanticScholar(topic) {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=5&fields=title,abstract,url,year,citationCount,venue`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("s2 error");
    const data = await res.json();
    return (data.data || [])
      .filter((p) => p.title)
      .map((p) => ({
        source: "Semantic Scholar",
        title: p.title,
        abstract: p.abstract || "",
        url: p.url,
        year: p.year || "",
        venue: p.venue || "",
        citations: p.citationCount,
      }));
  } catch (err) {
    return [];
  }
}

// ---------- Rendering ----------
function renderSummary(aiText, wiki, topic) {
  if (aiText) {
    const settings = getAiSettings();
    const providerLabel = settings.provider === "gemini" ? "AI · Gemini" : settings.provider === "anthropic" ? "AI · Claude" : "AI";
    summaryHeading.textContent = "AI Summary";
    summaryBadge.textContent = providerLabel;
    summaryBadge.classList.remove("wiki-badge");
    primerBody.innerHTML = aiText
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
      .join("");
    return;
  }
  summaryHeading.textContent = "Summary";
  summaryBadge.textContent = "wiki";
  summaryBadge.classList.add("wiki-badge");
  if (!wiki || !wiki.extract) {
    primerBody.innerHTML = `<p class="error-text">Couldn't pull an overview for "${escapeHtml(topic)}". Try a more standard name for it.</p>`;
    return;
  }
  primerBody.innerHTML = `<p>${escapeHtml(wiki.extract)}</p><p class="source-note">Wikipedia extract — add an API key (Claude or Gemini) in Settings for an AI-generated version instead.</p>`;
}

function renderImages(wikiThumb, openverseImages, topic) {
  const all = [];
  if (wikiThumb) all.push({ thumb: wikiThumb, page: null, credit: "Wikipedia" });
  openverseImages.forEach((img) => all.push(img));

  if (all.length === 0) {
    imagesBody.innerHTML = `<p class="error-text" style="grid-column:1/-1;">No images found for "${escapeHtml(topic)}".</p>`;
    return;
  }
  imagesBody.innerHTML = all
    .slice(0, 3)
    .map((img) => {
      const tag = `<img src="${img.thumb}" alt="${escapeHtml(topic)}" loading="lazy">`;
      return img.page ? `<a href="${img.page}" target="_blank" rel="noopener">${tag}</a>` : tag;
    })
    .join("") + `<span class="img-credit">Images via Wikipedia &amp; Openverse (CC-licensed).</span>`;
}

function renderPapers(papers, topic) {
  if (!papers || papers.length === 0) {
    papersBody.innerHTML = `<p class="error-text">No papers surfaced for "${escapeHtml(topic)}". Try <a href="https://www.semanticscholar.org/search?q=${encodeURIComponent(topic)}" target="_blank" rel="noopener">Semantic Scholar</a> directly.</p>`;
    return;
  }
  papersBody.innerHTML = papers
    .map((p) => {
      const meta = [p.source, p.year, p.venue, p.citations != null ? `${p.citations} citations` : null]
        .filter(Boolean)
        .join(" · ");
      return `
        <div class="paper-card">
          <p class="paper-title"><a href="${p.url || "#"}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a></p>
          <p class="paper-meta">${escapeHtml(meta)}</p>
          ${p.abstract ? `<p class="paper-abstract">${escapeHtml(truncate(p.abstract, 220))}</p>` : ""}
        </div>`;
    })
    .join("");
}

function renderRelated(topics) {
  if (!topics || topics.length === 0) {
    relatedBody.innerHTML = `<p class="error-text">No related topics found.</p>`;
    return;
  }
  relatedBody.innerHTML = "";
  topics.forEach((t) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      topicInput.value = t;
      openDossier(t);
    });
    relatedBody.appendChild(chip);
  });
}

// ---------- Main open-dossier flow ----------
async function openDossier(topic) {
  currentTopic = topic.trim();
  currentField = fieldForTopic(currentTopic);

  heroSection.hidden = true;
  dossierSection.hidden = false;

  dossierTitle.textContent = currentTopic;
  dossierField.textContent = currentField;

  primerBody.innerHTML = `<p class="loading">Thinking…</p>`;
  imagesBody.innerHTML = `<p class="loading">Fetching images…</p>`;
  papersBody.innerHTML = `<p class="loading">Querying CrossRef and Semantic Scholar…</p>`;
  relatedBody.innerHTML = `<p class="loading">Finding related nodes…</p>`;

  window.scrollTo({ top: 0, behavior: "smooth" });

  const [wiki, aiText, openverseImages, crossrefPapers, s2Papers] = await Promise.all([
    fetchWikipediaSummary(currentTopic),
    fetchAiSummary(currentTopic),
    fetchOpenverseImages(currentTopic),
    fetchCrossref(currentTopic),
    fetchSemanticScholar(currentTopic),
  ]);

  renderSummary(aiText, wiki, currentTopic);
  renderImages(wiki?.thumbnail, openverseImages, currentTopic);

  const seen = new Set();
  const mergedPapers = [...crossrefPapers, ...s2Papers].filter((p) => {
    const key = p.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  renderPapers(mergedPapers.slice(0, 6), currentTopic);

  const related = await fetchRelatedTopics(wiki?.title);
  renderRelated(related);

  // feed the mind map: this topic is now "explored", related topics become "suggested"
  if (window.NodewayMap) {
    window.NodewayMap.addExplored(currentTopic, currentField);
    window.NodewayMap.addSuggested(currentTopic, related);
  }
}

// ---------- Drawers / modal ----------
function toggleDrawer(drawer, open) {
  drawer.classList.toggle("open", open);
  scrim.hidden = !open;
}

pathToggle.addEventListener("click", () => toggleDrawer(pathDrawer, true));
closePathDrawer.addEventListener("click", () => toggleDrawer(pathDrawer, false));
historyToggle.addEventListener("click", () => toggleDrawer(historyDrawer, true));
closeHistoryDrawer.addEventListener("click", () => toggleDrawer(historyDrawer, false));
scrim.addEventListener("click", () => {
  toggleDrawer(pathDrawer, false);
  toggleDrawer(historyDrawer, false);
});

function refreshProviderHint() {
  const p = providerSelect.value;
  const info = PROVIDER_DEFAULTS[p] || PROVIDER_DEFAULTS.none;
  if (p === "none") {
    apiKeyInput.disabled = true;
    modelInput.disabled = true;
    apiKeyInput.value = "";
    providerHint.textContent = "No key needed — summaries will use the Wikipedia extract.";
    return;
  }
  apiKeyInput.disabled = false;
  modelInput.disabled = false;
  if (!modelInput.value) modelInput.value = info.model;
  providerHint.textContent = info.keyHelp + " Stored only in this browser's local storage.";
}

settingsToggle.addEventListener("click", () => {
  const settings = getAiSettings();
  providerSelect.value = settings.provider || "none";
  apiKeyInput.value = settings.apiKey || "";
  modelInput.value = settings.model || (PROVIDER_DEFAULTS[settings.provider]?.model ?? "");
  refreshProviderHint();
  settingsOverlay.hidden = false;
});
providerSelect.addEventListener("change", refreshProviderHint);
closeSettings.addEventListener("click", () => (settingsOverlay.hidden = true));
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) settingsOverlay.hidden = true;
});
saveApiKey.addEventListener("click", () => {
  const provider = providerSelect.value;
  setAiSettings({
    provider,
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim() || (PROVIDER_DEFAULTS[provider]?.model ?? ""),
  });
  settingsOverlay.hidden = true;
});
clearApiKey.addEventListener("click", () => {
  clearAiSettings();
  providerSelect.value = "none";
  apiKeyInput.value = "";
  modelInput.value = "";
  settingsOverlay.hidden = true;
});

// ---------- Search suggestions (typeahead against the topic shelf) ----------
function renderSuggestions(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    suggestionList.hidden = true;
    suggestionList.innerHTML = "";
    return;
  }
  const matches = TOPIC_SHELF.filter((t) => t.topic.toLowerCase().includes(q)).slice(0, 6);
  if (matches.length === 0) {
    suggestionList.hidden = true;
    suggestionList.innerHTML = "";
    return;
  }
  suggestionList.innerHTML = matches
    .map(
      (t) =>
        `<button type="button" class="suggestion-item" data-topic="${escapeHtml(t.topic)}">
           <span>${escapeHtml(t.topic)}</span><span class="suggestion-field">${escapeHtml(t.field)}</span>
         </button>`
    )
    .join("");
  suggestionList.hidden = false;
}

topicInput.addEventListener("input", () => renderSuggestions(topicInput.value));
topicInput.addEventListener("focus", () => renderSuggestions(topicInput.value));
suggestionList.addEventListener("click", (e) => {
  const btn = e.target.closest(".suggestion-item");
  if (!btn) return;
  const t = btn.dataset.topic;
  topicInput.value = t;
  suggestionList.hidden = true;
  openDossier(t);
});
document.addEventListener("click", (e) => {
  if (!topicInput.contains(e.target) && !suggestionList.contains(e.target)) {
    suggestionList.hidden = true;
  }
});

// ---------- Surprise-me hover popover ----------
function pickRandomTopics(n) {
  const pool = [...TOPIC_SHELF];
  const picks = [];
  while (picks.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

function renderSurpriseChips() {
  const picks = pickRandomTopics(5);
  surpriseChips.innerHTML = picks
    .map((t) => `<button type="button" class="chip surprise-chip" data-topic="${escapeHtml(t.topic)}">${escapeHtml(t.topic)}</button>`)
    .join("");
}

let surpriseHideTimer = null;
function openSurprisePopover() {
  clearTimeout(surpriseHideTimer);
  renderSurpriseChips();
  surprisePopover.hidden = false;
}
function scheduleHideSurprisePopover() {
  surpriseHideTimer = setTimeout(() => {
    surprisePopover.hidden = true;
  }, 250);
}

surpriseWrap.addEventListener("mouseenter", openSurprisePopover);
surpriseWrap.addEventListener("mouseleave", scheduleHideSurprisePopover);
randomBtn.addEventListener("touchstart", (e) => {
  if (surprisePopover.hidden) {
    e.preventDefault();
    openSurprisePopover();
  }
});
surpriseChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".surprise-chip");
  if (!chip) return;
  const t = chip.dataset.topic;
  topicInput.value = t;
  surprisePopover.hidden = true;
  openDossier(t);
});

// ---------- Form / nav ----------
topicForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = topicInput.value.trim();
  if (!val) return;
  suggestionList.hidden = true;
  openDossier(val);
});

randomBtn.addEventListener("click", () => {
  const pick = pickRandomTopic();
  topicInput.value = pick.topic;
  surprisePopover.hidden = true;
  openDossier(pick.topic);
});

newTopicBtn.addEventListener("click", () => {
  dossierSection.hidden = true;
  heroSection.hidden = false;
  topicInput.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

markReadBtn.addEventListener("click", () => {
  if (!currentTopic) return;
  saveToCatalogue(currentTopic, currentField);
  markReadBtn.textContent = "Catalogued ✓";
  setTimeout(() => (markReadBtn.textContent = "Catalogue this session"), 1600);
});

// ---------- Mind Map toggle ----------
const mapToggle = document.getElementById("mapToggle");
mapToggle.addEventListener("click", () => {
  if (window.NodewayMap) window.NodewayMap.open();
});

// ---------- Init ----------
renderCatalogue();
