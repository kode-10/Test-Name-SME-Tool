// ---------- State ----------
let currentTopic = null;
let currentField = "general";
let currentPapers = [];
let openInsightIdx = null;

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
const wikiLink = document.getElementById("wikiLink");
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

const scrim = document.getElementById("scrim");

const insightSheet = document.getElementById("insightSheet");
const insightTitle = document.getElementById("insightTitle");
const insightBody = document.getElementById("insightBody");
const insightOpenPaper = document.getElementById("insightOpenPaper");
const closeInsightSheet = document.getElementById("closeInsightSheet");

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

// ---------- Dark mode ----------
const THEME_STORAGE = "diveIn.theme";
const themeToggle = document.getElementById("themeToggle");
const themeIconSun = document.getElementById("themeIconSun");
const themeIconMoon = document.getElementById("themeIconMoon");

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeIconSun.hidden = true;
    themeIconMoon.hidden = false;
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeIconSun.hidden = false;
    themeIconMoon.hidden = true;
  }
}
function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE);
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
}
themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_STORAGE, next);
});
initTheme();

// ---------- AI tone & expertise tuning ----------
const TUNING_STORAGE = "diveIn.aiTuning";
const EXPERTISE_LABELS = { 1: "Beginner", 2: "Casual learner", 3: "Intermediate", 4: "Advanced", 5: "Expert" };

function getTuning() {
  try {
    const t = JSON.parse(localStorage.getItem(TUNING_STORAGE));
    if (t && t.tone) return t;
  } catch {}
  return { tone: "direct", customTone: "", expertise: 3 };
}
function setTuning(t) {
  localStorage.setItem(TUNING_STORAGE, JSON.stringify(t));
}

const TONE_TEXT = {
  direct: "Direct and analytical. Plain language, no fluff, no filler phrases like \"in conclusion\". Lead with the point.",
  friendly: "Warm, encouraging mentor tone — like a knowledgeable friend explaining something they love, still substantive.",
  academic: "Formal, academic register. Precise terminology, measured claims, no casual phrasing.",
};

function buildStyleInstruction() {
  const t = getTuning();
  const toneLine = t.tone === "custom" && t.customTone.trim()
    ? t.customTone.trim()
    : TONE_TEXT[t.tone] || TONE_TEXT.direct;

  const level = Number(t.expertise) || 3;
  const levelLines = {
    1: "Audience is a total beginner. Use everyday language, concrete analogies, and at least one worked example. Define any unavoidable jargon immediately in plain words.",
    2: "Audience has light familiarity. Use mostly simple language with a few field terms, each briefly explained. Include an example.",
    3: "Audience has working knowledge. Balance accessible language with proper terminology — explain only the less obvious terms.",
    4: "Audience is advanced. Use precise technical vocabulary freely, assume strong background, prioritize nuance over hand-holding.",
    5: "Audience is an expert. Use dense, precise technical vocabulary, assume deep background, go straight for the non-obvious insight and open tensions — skip basic explanation entirely.",
  };
  return `Tone: ${toneLine}\n${levelLines[level] || levelLines[3]}`;
}

// ---------- Catalogue (localStorage) ----------
const STORAGE_KEY = "diveIn.catalogue";
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

// ---------- Wikipedia (primer fallback + images) ----------
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

async function fetchWikiRelatedTopics(wikiTitle) {
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

// ---------- AI summary / related-topics / insights — via active connection ----------
const SUMMARY_PROMPT = (topic) =>
  `${buildStyleInstruction()}\n\nGive a 2-paragraph primer on "${topic}" for someone starting to go deep on it. First paragraph: what it actually is and why it matters. Second paragraph: the 2-3 central tensions or open questions in the field right now. Do not use markdown headers.`;

async function fetchAiSummary(topic) {
  if (!window.NodewayAI) return null;
  try {
    const text = await window.NodewayAI.callActive(SUMMARY_PROMPT(topic));
    return text || null;
  } catch (err) {
    return null;
  }
}

const NEXT_TOPICS_PROMPT = (topic) =>
  `Someone is learning about "${topic}" and wants to go deeper — actually become knowledgeable, not just read a summary. List 6 to 8 specific, concrete subtopics, prerequisite concepts, or adjacent skills they should learn next to build real understanding of "${topic}". Each one should be a short, specific topic name (2-6 words) — not a sentence, not a question. One per line, no numbering, no bullets, no markdown, no extra commentary.`;

async function fetchAiNextTopics(topic) {
  if (!window.NodewayAI) return [];
  try {
    const text = await window.NodewayAI.callActive(NEXT_TOPICS_PROMPT(topic));
    if (!text) return [];
    return text
      .split("\n")
      .map((l) => l.replace(/^[\s\-•\d.)]+/, "").trim())
      .filter((l) => l.length > 0 && l.length < 80)
      .slice(0, 8);
  } catch (err) {
    return [];
  }
}

// ---------- Images (Wikipedia thumbnail + Openverse, more of them, horizontal scroll) ----------
async function fetchOpenverseImages(topic) {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(topic)}&page_size=10&license_type=all`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("openverse error");
    const data = await res.json();
    return (data.results || [])
      .filter((r) => r.thumbnail || r.url)
      .slice(0, 10)
      .map((r) => ({
        thumb: r.thumbnail || r.url,
        page: r.foreign_landing_url || r.url,
        credit: r.creator || r.source || "",
      }));
  } catch (err) {
    return [];
  }
}

// ---------- Papers: CrossRef (broad coverage) + Semantic Scholar, merged + sorted by citations ----------
async function fetchCrossref(topic) {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(topic)}&rows=8&sort=relevance`;
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
        citations: typeof it["is-referenced-by-count"] === "number" ? it["is-referenced-by-count"] : null,
      }));
  } catch (err) {
    return [];
  }
}

async function fetchSemanticScholar(topic) {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=8&fields=title,abstract,url,year,citationCount,venue`;
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
        citations: typeof p.citationCount === "number" ? p.citationCount : null,
      }));
  } catch (err) {
    return [];
  }
}

// ---------- Rendering ----------
function renderSummary(aiText, wiki, topic) {
  wikiLink.hidden = !wiki?.url;
  if (wiki?.url) wikiLink.href = wiki.url;

  if (aiText) {
    const conn = window.NodewayAI ? window.NodewayAI.getActiveConnection() : null;
    const label = conn ? `AI · ${conn.nickname}` : "AI";
    summaryHeading.textContent = "AI Summary";
    summaryBadge.textContent = label;
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
  primerBody.innerHTML = `<p>${escapeHtml(wiki.extract)}</p><p class="source-note">Wikipedia extract — add an AI connection in Settings for a generated version instead.</p>`;
}

function renderImages(wikiThumb, openverseImages, topic) {
  const all = [];
  if (wikiThumb) all.push({ thumb: wikiThumb, page: null, credit: "Wikipedia" });
  openverseImages.forEach((img) => all.push(img));

  if (all.length === 0) {
    imagesBody.innerHTML = `<p class="error-text">No images found for "${escapeHtml(topic)}".</p>`;
    return;
  }
  imagesBody.innerHTML = all
    .map((img) => {
      const tag = `<img src="${img.thumb}" alt="${escapeHtml(topic)}" loading="lazy">`;
      return img.page
        ? `<a class="img-frame" href="${img.page}" target="_blank" rel="noopener">${tag}</a>`
        : `<span class="img-frame">${tag}</span>`;
    })
    .join("") + `<span class="img-credit-frame">Wikipedia &amp; Openverse<br>(CC-licensed) · scroll for more →</span>`;
}

function renderPapers(papers) {
  currentPapers = papers;
  openInsightIdx = null;
  closeInsightSheetFn();

  if (!papers || papers.length === 0) {
    papersBody.innerHTML = `<p class="error-text">No papers surfaced. Try <a href="https://www.semanticscholar.org/search?q=${encodeURIComponent(currentTopic)}" target="_blank" rel="noopener">Semantic Scholar</a> directly.</p>`;
    return;
  }
  papersBody.innerHTML = papers
    .map((p, idx) => {
      const meta = [p.source, p.year, p.venue, p.citations != null ? `${p.citations} citations` : null]
        .filter(Boolean)
        .join(" · ");
      return `
        <div class="paper-card" data-idx="${idx}">
          <p class="paper-title">${escapeHtml(p.title)}</p>
          <p class="paper-meta">${escapeHtml(meta)}</p>
          ${p.abstract ? `<p class="paper-abstract">${escapeHtml(truncate(p.abstract, 200))}</p>` : ""}
          <p class="paper-hint">Click for insights ↓</p>
        </div>`;
    })
    .join("");
}

function renderRelated(topics, sourceLabel) {
  if (!topics || topics.length === 0) {
    relatedBody.innerHTML = `<p class="error-text">Couldn't find related topics for "${escapeHtml(currentTopic)}". Try opening The Catalogue or Mind Map for other threads to pull on, or add an AI connection in Settings — it can suggest a learning path even when Wikipedia's related-pages data comes up empty.</p>`;
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
  if (sourceLabel) {
    const note = document.createElement("p");
    note.className = "chip-source-note";
    note.textContent = sourceLabel;
    relatedBody.appendChild(note);
  }
}

// ---------- Paper insight bottom sheet ----------
const INSIGHT_PROMPT = (paper) =>
  `${buildStyleInstruction()}\n\nHere is a research paper.\nTitle: ${paper.title}\nAbstract: ${paper.abstract || "(not available — infer conservatively from the title only, and say the abstract wasn't available)"}\n\nGive me, in plain text, no markdown headers:\n1. One sentence on what this paper is actually about.\n2. 2-3 bullet points (start each with "- ") on the key findings I should expect.\n3. One line: anything genuinely surprising or counter-intuitive here — or say "nothing especially surprising here" if not.\nKeep it tight.`;

function closeInsightSheetFn() {
  insightSheet.hidden = true;
  document.querySelectorAll(".paper-card.open").forEach((c) => c.classList.remove("open"));
  openInsightIdx = null;
}

function formatInsightText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let html = "";
  let inList = false;
  lines.forEach((line) => {
    const isBullet = /^[-•]\s*/.test(line);
    if (isBullet) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${escapeHtml(line.replace(/^[-•]\s*/, ""))}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${escapeHtml(line.replace(/^\d+\.\s*/, ""))}</p>`;
    }
  });
  if (inList) html += "</ul>";
  return html;
}

async function openInsightForPaper(idx) {
  const paper = currentPapers[idx];
  if (!paper) return;

  if (openInsightIdx === idx) {
    closeInsightSheetFn();
    return;
  }
  document.querySelectorAll(".paper-card.open").forEach((c) => c.classList.remove("open"));
  const card = papersBody.querySelector(`.paper-card[data-idx="${idx}"]`);
  if (card) card.classList.add("open");
  openInsightIdx = idx;

  insightTitle.textContent = paper.title;
  insightOpenPaper.href = paper.url || "#";
  insightBody.innerHTML = `<p class="loading">Generating insights…</p>`;
  insightSheet.hidden = false;

  let text = null;
  if (window.NodewayAI) {
    try {
      text = await window.NodewayAI.callActive(INSIGHT_PROMPT(paper));
    } catch (err) {
      text = null;
    }
  }
  if (openInsightIdx !== idx) return; // stale click guard

  if (text) {
    insightBody.innerHTML = formatInsightText(text);
  } else if (paper.abstract) {
    insightBody.innerHTML = `<p>${escapeHtml(paper.abstract)}</p><p class="source-note">Raw abstract — add an AI connection in Settings for generated insights instead.</p>`;
  } else {
    insightBody.innerHTML = `<p class="error-text">No abstract available and no AI connection configured. Open the paper directly to read it.</p>`;
  }
}

papersBody.addEventListener("click", (e) => {
  const card = e.target.closest(".paper-card");
  if (!card) return;
  openInsightForPaper(Number(card.dataset.idx));
});
closeInsightSheet.addEventListener("click", closeInsightSheetFn);

// ---------- Main open-dossier flow ----------
async function openDossier(topic) {
  currentTopic = topic.trim();
  currentField = fieldForTopic(currentTopic);
  closeInsightSheetFn();

  heroSection.hidden = true;
  dossierSection.hidden = false;

  dossierTitle.textContent = currentTopic;
  dossierField.textContent = currentField;

  primerBody.innerHTML = `<p class="loading">Thinking…</p>`;
  wikiLink.hidden = true;
  imagesBody.innerHTML = `<p class="loading">Fetching images…</p>`;
  papersBody.innerHTML = `<p class="loading">Querying CrossRef and Semantic Scholar…</p>`;
  relatedBody.innerHTML = `<p class="loading">Finding what to learn next…</p>`;

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
  const mergedPapers = [...crossrefPapers, ...s2Papers]
    .filter((p) => {
      const key = p.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.citations ?? -1) - (a.citations ?? -1));
  renderPapers(mergedPapers.slice(0, 12));

  // "Explore Next": prefer AI-generated learning path (specific, always populated
  // when a connection exists); fall back to Wikipedia's related-pages API.
  let related = [];
  let relatedSource = "";
  const aiNext = await fetchAiNextTopics(currentTopic);
  if (aiNext.length > 0) {
    related = aiNext;
    relatedSource = "AI-suggested — what to learn next to go deeper";
  } else {
    related = await fetchWikiRelatedTopics(wiki?.title);
    relatedSource = related.length ? "From Wikipedia's related pages" : "";
  }
  renderRelated(related, relatedSource);

  // feed the mind map: this topic is now "explored", related topics become "suggested"
  if (window.NodewayMap) {
    window.NodewayMap.addExplored(currentTopic, currentField);
    window.NodewayMap.addSuggested(currentTopic, related);
  }
}

// ---------- Drawers ----------
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

// ---------- Settings: tabs + tone/expertise tuning ----------
document.querySelectorAll(".settings-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".settings-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("paneConnections").hidden = tab.dataset.tab !== "connections";
    document.getElementById("paneTuning").hidden = tab.dataset.tab !== "tuning";
  });
});

const toneOptions = document.getElementById("toneOptions");
const customToneInput = document.getElementById("customToneInput");
const expertiseSlider = document.getElementById("expertiseSlider");
const expertiseLabel = document.getElementById("expertiseLabel");
const saveTuning = document.getElementById("saveTuning");

function loadTuningIntoUI() {
  const t = getTuning();
  document.querySelectorAll(".tone-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.tone === t.tone);
  });
  customToneInput.hidden = t.tone !== "custom";
  customToneInput.value = t.customTone || "";
  expertiseSlider.value = t.expertise || 3;
  expertiseLabel.textContent = EXPERTISE_LABELS[t.expertise || 3];
}

toneOptions.addEventListener("click", (e) => {
  const chip = e.target.closest(".tone-chip");
  if (!chip) return;
  document.querySelectorAll(".tone-chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  customToneInput.hidden = chip.dataset.tone !== "custom";
});

expertiseSlider.addEventListener("input", () => {
  expertiseLabel.textContent = EXPERTISE_LABELS[expertiseSlider.value];
});

saveTuning.addEventListener("click", () => {
  const activeChip = document.querySelector(".tone-chip.active");
  setTuning({
    tone: activeChip ? activeChip.dataset.tone : "direct",
    customTone: customToneInput.value,
    expertise: Number(expertiseSlider.value),
  });
  const original = saveTuning.textContent;
  saveTuning.textContent = "Saved ✓";
  setTimeout(() => (saveTuning.textContent = original), 1400);
});

document.getElementById("settingsToggle").addEventListener("click", loadTuningIntoUI);

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
  closeInsightSheetFn();
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
