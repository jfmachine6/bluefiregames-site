// Skill Tree v0.1.2
const WORKER = "https://bluefire-notion.jfedders6.workers.dev";

export async function initSkillTree() {
  const svg = d3.select("#tree-svg");
  const width = window.innerWidth;
  const height = window.innerHeight;

  svg.attr("viewBox", [0, 0, width, height]);

  const res = await fetch(`${WORKER}/skills`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });

  const skills = await res.json();
  document.getElementById("tree-loader").style.display = "none";

  // Normalize helper
  const normalize = id => (id || "").replace(/-/g, "").toLowerCase();

  // Build nodes
  const nodes = skills.map(s => ({
    id: s.id,
    normId: normalize(s.id),
    name: s.name,
    category: s.category,
    type: s.type,
    level: s.level || 1,
    parentSkills: (s.parentSkills || []).map(normalize),
    descendants: 0,
    radius: 0
  }));

  const nodeByNormId = new Map(nodes.map(n => [n.normId, n]));

  // Build children map (parent → children)
  const childrenMap = {};
  nodes.forEach(n => {
    n.parentSkills.forEach(p => {
      if (!childrenMap[p]) childrenMap[p] = [];
      childrenMap[p].push(n.normId);
    });
  });

  // Count descendants (all levels)
  function countDescendants(normId, memo = {}) {
    if (memo[normId] !== undefined) return memo[normId];
    const children = childrenMap[normId] || [];
    let total = children.length;
    children.forEach(childId => {
      total += countDescendants(childId, memo);
    });
    memo[normId] = total;
    return total;
  }

  const memo = {};
  nodes.forEach(n => {
    n.descendants = countDescendants(n.normId, memo);
  });

  // Compute radius from descendants (core skills become huge)
  nodes.forEach(n => {
    const base = 6;
    const scaled = Math.sqrt(n.descendants || 0) * 4;
    n.radius = base + scaled; // many descendants → much bigger
  });

  // Build links (parent → child), mark primary parent
  const links = [];
  skills.forEach(s => {
    const childNorm = normalize(s.id);
    (s.parentSkills || []).forEach((parentId, index) => {
      const parentNorm = normalize(parentId);
      const parentNode = nodeByNormId.get(parentNorm);
      const childNode = nodeByNormId.get(childNorm);
      if (parentNode && childNode) {
        links.push({
          source: parentNode,
          target: childNode,
          primary: index === 0
        });
      } else {
        console.warn("Missing parent or child:", parentId, "->", s.id);
      }
    });
  });

  // Category color scale
  const colorByCategory = d3.scaleOrdinal()
    .domain([...new Set(nodes.map(n => n.category))])
    .range(["#4fc3ff", "#ffdf88", "#ff7aa2", "#7dffb3", "#c58bff", "#ffa94f"]);

  // Brightness by mastery level
  const brightness = d3.scaleLinear()
    .domain([1, 10])
    .range([0.4, 1.0]);

  const g = svg.append("g");

  // Arrowhead marker
  const defs = svg.append("defs");
  defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#4fc3ff");

  // Zoom + pan
  const zoom = d3.zoom()
    .scaleExtent([0.3, 2.5])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Simulation (more spacing)
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.normId).distance(120).strength(0.9))
    .force("charge", d3.forceManyBody().strength(-350))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => d.radius + 8))
    .on("tick", ticked);

  // Links
  const link = g.append("g")
    .attr("stroke-linecap", "round")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link-line")
    .attr("marker-end", "url(#arrow)")
    .attr("stroke-width", d => d.primary ? 3 : 1.2)
    .attr("stroke", d => d.primary ? "#4fc3ff" : "rgba(79, 195, 255, 0.25)");

  // Shape mapping by type
  function shapeFor(d) {
    switch ((d.type || "").toLowerCase()) {
      case "cognitive":
        return d3.symbolCircle;
      case "technical":
        return d3.symbolSquare;
      case "creative":
        return d3.symbolDiamond;
      case "physical":
        return d3.symbolTriangle;
      default:
        return d3.symbolCircle;
    }
  }

  // Nodes
  const node = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(drag(simulation));

  const shapes = node.append("path")
    .attr("d", d3.symbol()
      .type(d => shapeFor(d))
      .size(d => Math.pow(d.radius, 2) * 10)
    )
    .attr("fill", d => {
      const base = d3.color(colorByCategory(d.category) || "#4fc3ff");
      const b = brightness(d.level);
      base.l = b * 100;
      return base.formatRgb();
    })
    .attr("stroke", "#1a2a4a")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      if (window.openSkillModal) {
        window.openSkillModal(d.id);
      }
    })
    .on("mouseover", (event, d) => {
      highlightNode(d.normId, true);
    })
    .on("mouseout", (event, d) => {
      highlightNode(d.normId, false);
    });

  const labels = node.append("text")
    .attr("class", "node-label")
    .attr("x", d => d.radius + 4)
    .attr("y", 3)
    .text(d => d.name);

  // Tick update (shorten link to stop at node edge)
  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const r = d.target.radius + 6;
        return d.target.x - (dx / len) * r;
      })
      .attr("y2", d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const r = d.target.radius + 6;
        return d.target.y - (dy / len) * r;
      });

    node
      .attr("transform", d => `translate(${d.x},${d.y})`);
  }

  // Drag behavior
  function drag(sim) {
    function dragstarted(event, d) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  // Extended hover: include neighbors up to depth 2
  function getExtendedRelations(startNormId, depth = 2) {
    const visited = new Set([startNormId]);
    let frontier = [startNormId];

    for (let i = 0; i < depth; i++) {
      const next = [];
      frontier.forEach(id => {
        links.forEach(l => {
          const sId = l.source.normId;
          const tId = l.target.normId;
          if (sId === id && !visited.has(tId)) {
            visited.add(tId);
            next.push(tId);
          }
          if (tId === id && !visited.has(sId)) {
            visited.add(sId);
            next.push(sId);
          }
        });
      });
      frontier = next;
    }

    return visited;
  }

  function highlightNode(normId, on) {
    if (!on) {
      link
        .classed("highlight", false)
        .attr("stroke-opacity", 1);

      shapes.attr("opacity", 1);
      labels.attr("opacity", 1);
      return;
    }

    const related = getExtendedRelations(normId, 2);

    link
      .classed("highlight", d =>
        d.source.normId === normId || d.target.normId === normId
      )
      .attr("stroke-opacity", d =>
        related.has(d.source.normId) || related.has(d.target.normId) ? 1 : 0.1
      );

    shapes.attr("opacity", d => related.has(d.normId) ? 1 : 0.2);
    labels.attr("opacity", d => related.has(d.normId) ? 1 : 0.15);
  }

  // Recenter button
  const recenterBtn = document.getElementById("recenter-btn");
  if (recenterBtn) {
    recenterBtn.addEventListener("click", () => {
      svg.transition()
        .duration(600)
        .call(zoom.transform, d3.zoomIdentity);
    });
  }

  // Handle window resize
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    svg.attr("viewBox", [0, 0, w, h]);
    simulation.force("center", d3.forceCenter(w / 2, h / 2));
    simulation.alpha(0.3).restart();
  });
}
