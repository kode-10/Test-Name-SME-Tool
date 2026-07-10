// ---------- Mind Map: persisted graph + D3 force-directed render ----------
(function () {
  const GRAPH_STORAGE = "nodeway.graph";
  const MAX_NODES = 120; // keep the map readable and localStorage small

  function loadGraph() {
    try {
      const g = JSON.parse(localStorage.getItem(GRAPH_STORAGE));
      if (g && Array.isArray(g.nodes) && Array.isArray(g.links)) return g;
    } catch {}
    return { nodes: [], links: [] };
  }

  function saveGraph(g) {
    // trim oldest suggested nodes first if we're over budget
    if (g.nodes.length > MAX_NODES) {
      const explored = g.nodes.filter((n) => n.status === "explored");
      const suggested = g.nodes.filter((n) => n.status !== "explored").slice(-1 * (MAX_NODES - explored.length));
      const keepIds = new Set([...explored, ...suggested].map((n) => n.id));
      g.nodes = g.nodes.filter((n) => keepIds.has(n.id));
      g.links = g.links.filter((l) => keepIds.has(l.source.id || l.source) && keepIds.has(l.target.id || l.target));
    }
    localStorage.setItem(GRAPH_STORAGE, JSON.stringify(g));
  }

  function nodeId(topic) {
    return topic.trim().toLowerCase();
  }

  function addExplored(topic, field) {
    const g = loadGraph();
    const id = nodeId(topic);
    const existing = g.nodes.find((n) => n.id === id);
    if (existing) {
      existing.status = "explored";
      existing.field = field;
      existing.label = topic;
    } else {
      g.nodes.push({ id, label: topic, field: field || "general", status: "explored" });
    }
    saveGraph(g);
  }

  function addSuggested(fromTopic, relatedTitles) {
    if (!relatedTitles || relatedTitles.length === 0) return;
    const g = loadGraph();
    const fromId = nodeId(fromTopic);
    if (!g.nodes.find((n) => n.id === fromId)) {
      g.nodes.push({ id: fromId, label: fromTopic, field: "general", status: "explored" });
    }
    relatedTitles.forEach((title) => {
      const id = nodeId(title);
      if (id === fromId) return;
      if (!g.nodes.find((n) => n.id === id)) {
        g.nodes.push({ id, label: title, field: "general", status: "suggested" });
      }
      const linkExists = g.links.find(
        (l) => (l.source === fromId || l.source?.id === fromId) && (l.target === id || l.target?.id === id)
      );
      if (!linkExists) g.links.push({ source: fromId, target: id });
    });
    saveGraph(g);
  }

  function clearGraph() {
    localStorage.removeItem(GRAPH_STORAGE);
  }

  // ---------- Rendering ----------
  const overlay = document.getElementById("mapOverlay");
  const svgEl = document.getElementById("mapSvg");
  const emptyEl = document.getElementById("mapEmpty");
  const closeBtn = document.getElementById("closeMapBtn");
  const clearBtn = document.getElementById("clearMapBtn");

  let simulation = null;

  function render() {
    const g = loadGraph();
    svgEl.innerHTML = "";

    if (g.nodes.length === 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    const width = svgEl.clientWidth || 900;
    const height = svgEl.clientHeight || 560;

    const svg = d3.select(svgEl).attr("viewBox", [0, 0, width, height]);
    const zoomLayer = svg.append("g");

    svg.call(
      d3.zoom().scaleExtent([0.4, 2.5]).on("zoom", (event) => {
        zoomLayer.attr("transform", event.transform);
      })
    );

    // deep-copy so d3 can mutate x/y without corrupting storage until we save on drag end
    const nodes = g.nodes.map((n) => ({ ...n }));
    const links = g.links.map((l) => ({ ...l }));

    if (simulation) simulation.stop();
    simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(90).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(34));

    const link = zoomLayer
      .append("g")
      .attr("stroke", "#c7cae0")
      .attr("stroke-width", 1.4)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = zoomLayer
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "map-node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.25).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (event, d) => {
        overlay.hidden = true;
        const input = document.getElementById("topicInput");
        input.value = d.label;
        window.scrollTo({ top: 0, behavior: "smooth" });
        // openDossier is defined in app.js, in the same global scope
        if (typeof openDossier === "function") openDossier(d.label);
      });

    node
      .append("circle")
      .attr("r", (d) => (d.status === "explored" ? 12 : 8))
      .attr("fill", (d) => (d.status === "explored" ? "#16a394" : "#4c4fe0"))
      .attr("fill-opacity", (d) => (d.status === "explored" ? 1 : 0.55))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node
      .append("text")
      .text((d) => d.label)
      .attr("x", 16)
      .attr("y", 4)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", 11)
      .attr("font-weight", (d) => (d.status === "explored" ? 700 : 500))
      .attr("fill", "#14161f")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  }

  function open() {
    overlay.hidden = false;
    // render after the overlay is visible so clientWidth/Height are correct
    requestAnimationFrame(render);
  }
  function close() {
    overlay.hidden = true;
    if (simulation) simulation.stop();
  }

  closeBtn.addEventListener("click", close);
  clearBtn.addEventListener("click", () => {
    if (confirm("Clear the entire mind map? This can't be undone.")) {
      clearGraph();
      render();
    }
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  window.addEventListener("resize", () => {
    if (!overlay.hidden) render();
  });

  window.NodewayMap = { addExplored, addSuggested, clearGraph, open, close };
})();
