// Skill Tree v0.1.5
const WORKER = "https://bluefire-notion.jfedders6.workers.dev";

export async function initSkillTree() {
  const svg = d3.select("#tree-svg");
  const width = window.innerWidth;
  const height = window.innerHeight - 230;

  svg.attr("viewBox", [0, 0, width, height]);

  const res = await fetch(`${WORKER}/skills`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });

  const skills = await res.json();
  document.getElementById("tree-loader").style.display = "none";

  const normalize = id => (id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  // Build nodes
  const nodes = skills.map(s => ({
    id: s.id,
    normId: normalize(s.id),
    normName: normalize(s.name),
    name: s.name,
    category: s.category,
    type: s.type,
    level: s.level || 1,
    parentSkills: (s.parentSkills || []).map(normalize),
    descendants: 0,
    radius: 0
  }));

  const nodeByNormId = new Map(nodes.map(n => [n.normId, n]));
  const nodeByNormName = new Map(nodes.map(n => [n.normName, n]));

  function getNode(norm) {
    return nodeByNormId.get(norm) || nodeByNormName.get(norm);
  }

  // Build children map
  const childrenMap = {};
  nodes.forEach(n => {
    n.parentSkills.forEach(p => {
      if (!childrenMap[p]) childrenMap[p] = [];
      childrenMap[p].push(n.normId);
    });
  });

  // Count descendants
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

  // Compute radius
  nodes.forEach(n => {
    const base = 8;
    const scaled = Math.sqrt(n.descendants || 0) * 5;
    n.radius = base + scaled;
  });

  // Build links
  const links = [];

  // First pass: from skills
  skills.forEach(s => {
    const childNorm = normalize(s.id);
    (s.parentSkills || []).forEach((parentId, index) => {
      const parentNorm = normalize(parentId);
      const parentNode = getNode(parentNorm);
      const childNode = getNode(childNorm);
      if (parentNode && childNode) {
        links.push({
          source: parentNode,
          target: childNode,
          primary: index === 0
        });
      }
    });
  });

  // Second pass: ensure every parentSkill has a link
  nodes.forEach(child => {
    child.parentSkills.forEach(parentNorm => {
      const parentNode = getNode(parentNorm);
      if (!parentNode) return;

      const exists = links.some(
        l => l.source === parentNode && l.target === child
      );
      if (!exists) {
        links.push({
          source: parentNode,
          target: child,
          primary: false
        });
      }
    });
  });

  // Color scale
  const categories = [...new Set(nodes.map(n => n.category))];
  const colorByCategory = d3.scaleOrdinal()
    .domain(categories)
    .range(["#4fc3ff", "#ffdf88", "#ff7aa2", "#7dffb3", "#c58bff", "#ffa94f"]);

  // Brightness / glow by mastery
  const lightScale = d3.scaleLinear().domain([1, 5, 10]).range([0.05, 0.4, 0.85]);
  const satScale   = d3.scaleLinear().domain([1, 5, 10]).range([0.15, 0.6, 1.0]);

  const g = svg.append("g");

  // Glow filter
  const defs = svg.append("defs");
  const glow = defs.append("filter")
    .attr("id", "node-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  glow.append("feGaussianBlur")
    .attr("stdDeviation", "4")
    .attr("result", "blur");

  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.3, 2.5])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Simulation
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.normId)
      .distance(d => d.source.radius + d.target.radius + 300)
      .strength(1.0)
    )
    .force("charge", d3.forceManyBody().strength(-650))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => d.radius + 30))
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

  // Shapes — category-based
  const shapeTypes = [
    d3.symbolCircle,
    d3.symbolSquare,
    d3.symbolDiamond,
    d3.symbolTriangle,
    d3.symbolStar
  ];

  const shapeByCategory = new Map();
  categories.forEach((cat, i) => {
    shapeByCategory.set(cat, shapeTypes[i % shapeTypes.length]);
  });

  function shapeFor(d) {
    return shapeByCategory.get(d.category) || d3.symbolCircle;
  }

  const node = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(drag(simulation));

  const shapes = node.append("path")
    .attr("d", d =>
      d3.symbol()
        .type(shapeFor(d))
        .size(Math.pow(d.radius, 2) * 10)()
    )
    .attr("fill", d => {
      let base = d3.hsl(colorByCategory(d.category) || "#4fc3ff");
      base.l = lightScale(d.level);
      base.s = satScale(d.level);
      return base.toString();
    })
    .attr("stroke", "#1a2a4a")
    .attr("stroke-width", 1.5)
    .attr("filter", d => d.level >= 8 ? "url(#node-glow)" : null)
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

  // Labels
  const labels = node.append("text")
    .attr("class", "node-label")
    .text(d => d.name)
    .attr("dy", "0.35em")
    .each(function(d) {
      const label = d3.select(this);
      if (d.radius >= 45) {
        label.attr("text-anchor", "middle").attr("x", 0).style("font-size", "15px");
      } else if (d.radius >= 25) {
        label.attr("text-anchor", "start").attr("x", d.radius + 14).style("font-size", "12px");
      } else {
        label.attr("text-anchor", "start").attr("x", d.radius + 8).style("font-size", "9px");
      }
    });

  // Tick update
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

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  }

  // Drag
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

  // Extended hover
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
      link.classed("highlight", false).attr("stroke-opacity", 1);
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

  // Search
  const searchBox = document.getElementById("skill-search");
  const resultsBox = document.getElementById("search-results");

  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase();
    if (!q) {
      resultsBox.style.display = "none";
      return;
    }

    const matches = nodes.filter(n => n.name.toLowerCase().includes(q));

    resultsBox.innerHTML = "";
    matches.forEach(m => {
      const item = document.createElement("div");
      item.className = "search-item";
      item.textContent = m.name;
      item.onclick = () => {
        zoomToNode(m);
        resultsBox.style.display = "none";
      };
      resultsBox.appendChild(item);
    });

    resultsBox.style.display = matches.length ? "block" : "none";
  });

  function zoomToNode(node) {
    const t = d3.zoomIdentity
      .translate(width / 2 - node.x * 1.2, height / 2 - node.y * 1.2)
      .scale(1.2);

    svg.transition().duration(600).call(zoom.transform, t);

    // pulse highlight
    shapes
      .filter(d => d.normId === node.normId)
      .transition()
      .duration(200)
      .attr("stroke-width", 4)
      .transition()
      .duration(200)
      .attr("stroke-width", 1.5);
  }

  // Recenter
  document.getElementById("recenter-btn").onclick = () => {
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
  };

  // Resize
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight - 230;
    svg.attr("viewBox", [0, 0, w, h]);
    simulation.force("center", d3.forceCenter(w / 2, h / 2));
    simulation.alpha(0.3).restart();
  });
}
