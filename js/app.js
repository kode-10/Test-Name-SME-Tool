// ---------- Call number generator (decorative, LOC-flavored) ----------
const CLASS_MAP = {
  law: "KF", economics: "HB", physics: "QC", biology: "QH",
  philosophy: "BD", engineering: "TA", "computer science": "QA76",
  history: "D", psychology: "BF", linguistics: "P", medicine: "R",
  chemistry: "QD", mathematics: "QA", "political science": "JZ",
  "art and design": "NK", anthropology: "GN", sociology: "HM",
  "environmental science": "GE", astronomy: "QB", neuroscience: "QP",
  general: "AZ",
};

function makeCallNumber(field) {
  const cls = CLASS_MAP[field] || CLASS_MAP.general;
  const num = Math.floor(100 + Math.random() * 899);
  const year = 2026;
  return `CALL NO. ${cls}${num} .F5 ${year}`;
}

// ---------- State ----------
let currentTopic = null;
let currentField = "general";

// ---------- DOM refs ----------
const intakeSection = document.getElementById("intake");
const dossierSection = document.getElementById("dossier");
const topicForm = document.getElementById("topicForm");
const topicInput = document.getElementById("topicInput");
const randomBtn = document.getElementById("randomBtn");
const callNumberEl = document.getElementById("callNumber");
const dossierCallNumberEl = document.getElementById("dossierCallNumber");
const dossierTitle = document.getElementById("dossierTitle");
const dossierTags = document.getElementById("dossierTags");
const primerBody = document.getElementById("primerBody");
const primerSource = document.getElementById("primerSource");
const papersBody = document.getElementById("papersBody");
const newTopicBtn = document.getElementById("newTopicBtn");
const markReadBtn = document.getElementById("markReadBtn");
const historyToggle = document.getElementById("historyToggle");
const historyCount = document.getElementById("historyCount");
const historyDrawer = document.getElementById("historyDrawer");
const closeDrawer = document.getElementById("closeDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const historyList = document.getElementById("historyList");

// randomize the intake call number on load, just for flavor
callNumberEl.textContent = makeCallNumber("general");

// ---------- Catalogue (localStorage) ----------
const STORAGE_KEY = "fieldlog.catalogue";

function getCatalogue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToCatalogue(topic, field) {
  const cat = getCatalogue();
  const entry = { topic, field, date: new Date().toISOString() };
  cat.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cat.slice(0, 200)));
  renderCatalogue();
}

function renderCatalogue() {
  const cat = getCatalogue();
  historyCount.textContent = `(${cat.length})`;
  historyList.innerHTML = "";
  if (cat.length === 0) {
    historyList.innerHTML = `<li class="drawer-empty">Nothing catalogued yet. Open a file to begin.</li>`;
    return;
  }
  cat.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "drawer-item";
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    li.innerHTML = `<span class="drawer-item-title">${escapeHtml(entry.topic)}</span><span class="drawer-item-date">${dateStr}</span>`;
    li.addEventListener("click", () => {
      toggleDrawer(false);
      topicInput.value = entry.topic;
      openDossier(entry.topic);
    });
    historyList.appendChild(li);
  });
}

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

// ---------- Wikipedia primer ----------
async function fetchPrimer(topic) {
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
      url: data.content_urls && data.content_urls.desktop ? data.content_urls.desktop.page : null,
    };
  } catch (err) {
    return null;
  }
}

// ---------- arXiv papers ----------
async function fetchArxiv(topic) {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(topic)}&start=0&max_results=4&sortBy=relevance&sortOrder=descending`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("arxiv error");
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, "application/xml");
    const entries = Array.from(xml.getElementsByTagName("entry"));
    return entries.map((e) => {
      const getTag = (tag) => {
        const el = e.getElementsByTagName(tag)[0];
        return el ? el.textContent.trim() : "";
      };
      const idLink = getTag("id");
      const published = getTag("published").slice(0, 4);
      return {
        source: "arXiv",
        title: getTag("title").replace(/\s+/g, " "),
        abstract: getTag("summary").replace(/\s+/g, " "),
        url: idLink,
        year: published,
      };
    });
  } catch (err) {
    return [];
  }
}

// ---------- Semantic Scholar papers ----------
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
function renderPrimer(primer, topic) {
  if (!primer || !primer.extract) {
    primerBody.innerHTML = `<p class="error-text">Couldn't pull a clean overview for "${escapeHtml(topic)}" — try a slightly more standard name for it, or open the source links in the papers panel directly.</p>`;
    primerSource.textContent = "";
    return;
  }
  primerBody.innerHTML = `<p>${escapeHtml(primer.extract)}</p>`;
  primerSource.innerHTML = primer.url
    ? `Source: Wikipedia — <a href="${primer.url}" target="_blank" rel="noopener" style="color:inherit;">${escapeHtml(primer.title)}</a>`
    : "";
}

function renderPapers(papers, topic) {
  if (!papers || papers.length === 0) {
    papersBody.innerHTML = `<p class="error-text">No papers surfaced automatically for "${escapeHtml(topic)}". Try <a href="https://www.google.com/search?q=${encodeURIComponent(topic)}+site:arxiv.org" target="_blank" rel="noopener" style="color:var(--green-dark);">searching arXiv directly</a> or <a href="https://www.semanticscholar.org/search?q=${encodeURIComponent(topic)}" target="_blank" rel="noopener" style="color:var(--green-dark);">Semantic Scholar</a>.</p>`;
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
          ${p.abstract ? `<p class="paper-abstract">${escapeHtml(truncate(p.abstract, 260))}</p>` : ""}
        </div>`;
    })
    .join("");
}

function updatePathFillers(topic) {
  document.querySelectorAll(".topic-fill").forEach((el) => {
    el.textContent = topic;
  });
}

// ---------- Main open-dossier flow ----------
async function openDossier(topic) {
  currentTopic = topic.trim();
  currentField = fieldForTopic(currentTopic);

  intakeSection.hidden = true;
  dossierSection.hidden = false;

  dossierTitle.textContent = currentTopic;
  dossierCallNumberEl.textContent = makeCallNumber(currentField);
  dossierTags.innerHTML = `<span class="tag">${escapeHtml(currentField)}</span>`;
  updatePathFillers(currentTopic);

  primerBody.innerHTML = `<p class="loading">Pulling the overview…</p>`;
  primerSource.textContent = "";
  papersBody.innerHTML = `<p class="loading">Searching arXiv and Semantic Scholar…</p>`;

  window.scrollTo({ top: 0, behavior: "smooth" });

  const [primer, arxivPapers, s2Papers] = await Promise.all([
    fetchPrimer(currentTopic),
    fetchArxiv(currentTopic),
    fetchSemanticScholar(currentTopic),
  ]);

  renderPrimer(primer, currentTopic);

  // merge, dedupe loosely by lowercased title, arXiv first
  const seen = new Set();
  const merged = [...arxivPapers, ...s2Papers].filter((p) => {
    const key = p.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  renderPapers(merged.slice(0, 7), currentTopic);
}

// ---------- Drawer ----------
function toggleDrawer(open) {
  historyDrawer.classList.toggle("open", open);
  drawerOverlay.hidden = !open;
}

// ---------- Event wiring ----------
topicForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = topicInput.value.trim();
  if (!val) return;
  openDossier(val);
});

randomBtn.addEventListener("click", () => {
  const pick = pickRandomTopic();
  topicInput.value = pick.topic;
  openDossier(pick.topic);
});

newTopicBtn.addEventListener("click", () => {
  dossierSection.hidden = true;
  intakeSection.hidden = false;
  topicInput.value = "";
  callNumberEl.textContent = makeCallNumber("general");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

markReadBtn.addEventListener("click", () => {
  if (!currentTopic) return;
  saveToCatalogue(currentTopic, currentField);
  markReadBtn.textContent = "Catalogued ✓";
  setTimeout(() => (markReadBtn.textContent = "Catalogue this session"), 1600);
});

historyToggle.addEventListener("click", () => toggleDrawer(true));
closeDrawer.addEventListener("click", () => toggleDrawer(false));
drawerOverlay.addEventListener("click", () => toggleDrawer(false));

// ---------- Init ----------
renderCatalogue();
