// ---------- Mind Map: persisted graph + clustered D3 force-directed render ----------
(function () {
  const GRAPH_STORAGE = "diveIn.graph";
  const MAX_NODES = 140;

  function loadGraph() {
    try {
      const g = JSON.parse(localStorage.getItem(GRAPH_STORAGE));
      if (g && Array.isArray(g.nodes) && Array.isArray(g.links)) {
        if (!g.clusterNames) g.clusterNames = {};
        return g;
      }
    } catch {}
    return { nodes: [], links: [], clusterNames: {} };
  }

  function saveGraph(g) {
    if (g.nodes.length > MAX_NODES) {
      const explored = g.nodes.filter((n) => n.status === "explored");
      const suggested = g.nodes.filter((n) => n.status !== "explored").slice(-1 * (MAX_NODES - explored.length));
      const keepIds = new Set([...explored, ...suggested].map((n) => n.id));
      g.nodes = g.nodes.filter((n) => keepIds.has(n.id));
      g.links = g.links.filter(
        (l) => keepIds.has(l.source.id || l.source) && keepIds.has(l.target.id || l.target)
      );
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
      if (!existing.clusterId) existing.clusterId = id;
    } else {
      g.nodes.push({ id, label: topic, field: field || "general", status: "explored", clusterId: id });
    }
    saveGraph(g);
  }

  function addSuggested(fromTopic, relatedTitles) {
    if (!relatedTitles || relatedTitles.length === 0) return;
    const g = loadGraph();
    const fromId = nodeId(fromTopic);
    let fromNode = g.nodes.find((n) => n.id === fromId);
    if (!fromNode) {
      fromNode = { id: fromId, label: fromTopic, field: "general", status: "explored", clusterId: fromId };
      g.nodes.push(fromNode);
    }
    const clusterId = fromNode.clusterId || fromId;

    relatedTitles.forEach((title) => {
      const id = nodeId(title);
      if (id === fromId) return;
      let node = g.nodes.find((n) => n.id === id);
      if (!node) {
        node = { id, label: title, field: "general", status: "suggested", clusterId };
        g.nodes.push(node);
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

  function renameCluster(clusterId, name) {
    const g = loadGraph();
    g.clusterNames[clusterId] = name;
    saveGraph(g);
  }

  function clusterLabelFor(g, clusterId) {
    if (g.clusterNames[clusterId]) return g.clusterNames[clusterId];
    const root = g.nodes.find((n) => n.id === clusterId);
    return root ? root.label : clusterId;
  }

  // ---------- Rendering ----------
  const overlay = document.getElementById("mapOverlay");
  const svgEl = document.getElementById("mapSvg");
  const emptyEl = document.getElementById("mapEmpty");
  const closeBtn = document.getElementById("closeMapBtn");
  const clearBtn = document.getElementById("clearMapBtn");

  let simulation = null;
  const hullLine = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.9));

  function computeClusterPaths(nodes) {
    const byCluster = d3.group(nodes, (d) => d.clusterId);
    const paths = [];
    byCluster.forEach((members, clusterId) => {
      if (members.length < 2) return; // singletons don't get a blob
      const pts = members.map((m) => [m.x, m.y]);
      const cx = d3.mean(pts, (p) => p[0]);
      const cy = d3.mean(pts, (p) => p[1]);
      const pad = 46;
      let hullPts;
      if (pts.length === 2) {
        // fake a capsule by adding two offset points perpendicular to the line
        const [a, b] = pts;
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * pad, ny = (dx / len) * pad;
        hullPts = [
          [a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny],
          [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny],
        ];
      } else {
        const hull = d3.polygonHull(pts);
        if (!hull) return;
        hullPts = hull.map(([x, y]) => {
          const dx = x - cx, dy = y - cy;
          const dist = Math.hypot(dx, dy) || 1;
          const scale = (dist + pad) / dist;
          return [cx + dx * scale, cy + dy * scale];
        });
      }
      const topPoint = hullPts.reduce((top, p) => (p[1] < top[1] ? p : top), hullPts[0]);
      paths.push({ clusterId, d: hullLine(hullPts), labelX: topPoint[0], labelY: topPoint[1] - 10 });
    });
    return paths;
  }

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
    const clusterLayer = zoomLayer.append("g").attr("class", "cluster-layer");
    const linkLayer = zoomLayer.append("g");
    const nodeLayer = zoomLayer.append("g");

    svg.call(
      d3.zoom().scaleExtent([0.35, 2.5]).on("zoom", (event) => {
        zoomLayer.attr("transform", event.transform);
      })
    );

    const nodes = g.nodes.map((n) => ({ ...n }));
    const links = g.links.map((l) => ({ ...l }));

    if (simulation) simulation.stop();
    simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(90).strength(0.55))
      .force("charge", d3.forceManyBody().strength(-230))
      .force("cluster", forceCluster(nodes, 0.04))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(34));

    function forceCluster(allNodes, strength) {
      return function (alpha) {
        const centroids = d3.rollup(
          allNodes,
          (v) => ({ x: d3.mean(v, (d) => d.x), y: d3.mean(v, (d) => d.y) }),
          (d) => d.clusterId
        );
        allNodes.forEach((d) => {
          const c = centroids.get(d.clusterId);
          if (!c || c.x == null) return;
          d.vx -= (d.x - c.x) * strength * alpha;
          d.vy -= (d.y - c.y) * strength * alpha;
        });
      };
    }

    const link = linkLayer
      .attr("stroke", "var(--shadow-dark)")
      .attr("stroke-width", 1.4)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = nodeLayer
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
      .attr("fill", "var(--text)")
      .style("pointer-events", "none");

    let tickCount = 0;
    simulation.on("tick", () => {
      tickCount++;
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);

      if (tickCount % 4 === 0) drawClusters(nodes, g);
    });
    simulation.on("end", () => drawClusters(nodes, g));

    function drawClusters(currentNodes, graphData) {
      const paths = computeClusterPaths(currentNodes);
      const sel = clusterLayer.selectAll("g.cluster-blob").data(paths, (d) => d.clusterId);
      const enter = sel.enter().append("g").attr("class", "cluster-blob");
      enter.append("path");
      enter
        .append("text")
        .attr("class", "cluster-label")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", "var(--indigo)")
        .attr("text-anchor", "middle")
        .style("cursor", "text")
        .on("dblclick", function (event, d) {
          event.stopPropagation();
          const current = clusterLabelFor(graphData, d.clusterId);
          const name = window.prompt("Name this cluster:", current);
          if (name && name.trim()) {
            renameCluster(d.clusterId, name.trim());
            d3.select(this).text(name.trim());
          }
        });

      const merged = enter.merge(sel);
      merged.select("path")
        .attr("d", (d) => d.d)
        .attr("fill", "var(--indigo-soft)")
        .attr("fill-opacity", 0.35)
        .attr("stroke", "var(--indigo)")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 1.5);
      merged.select("text")
        .attr("x", (d) => d.labelX)
        .attr("y", (d) => d.labelY)
        .text((d) => clusterLabelFor(graphData, d.clusterId));

      sel.exit().remove();
    }
  }

  function open() {
    overlay.hidden = false;
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

  window.NodewayMap = { addExplored, addSuggested, clearGraph, renameCluster, open, close };
})();
