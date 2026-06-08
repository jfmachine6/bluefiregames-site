// Skill Tree v0.1.7 — Wide Web + Hover Pulses
const WORKER = "https://bluefire-notion.jfedders6.workers.dev";

export async function initSkillTree() {
  const svg = d3.select("#tree-svg");
  const containerTop = document.getElementById("tree-container").offsetTop;
  let width = window.innerWidth;
  let height = window.innerHeight - containerTop;

  svg.attr("viewBox", [0, 0, width, height]);

  const res = await fetch(`${WORKER}/skills`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });
  const skills = await res.json();

  window.__ALL_SKILLS__ = skills;

  // Preload all devlogs,tasks,projects for instant modal access
  const devlogRes = await fetch(`${WORKER}/devlogs`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });
  window.__ALL_DEVLOGS__ = await devlogRes.json();

  // Preload Projects
  const projRes = await fetch(`${WORKER}/projects`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });
  window.__ALL_PROJECTS__ = await projRes.json();

  // Preload Tasks
  const taskRes = await fetch(`${WORKER}/tasks`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });
  window.__ALL_TASKS__ = await taskRes.json();








  document.getElementById("tree-loader").style.display = "none";

  const normalize = id => (id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

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

  const childrenMap = {};
  nodes.forEach(n => {
    n.parentSkills.forEach(p => {
      if (!childrenMap[p]) childrenMap[p] = [];
      childrenMap[p].push(n.normId);
    });
  });

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

  nodes.forEach(n => {
    const base = 8;
    const scaled = Math.sqrt(n.descendants || 0) * 5;
    n.radius = base + scaled;
  });

  const links = [];

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

  const categories = [...new Set(nodes.map(n => n.category))];
  const colorByCategory = d3.scaleOrdinal()
    .domain(categories)
    .range(["#4fc3ff", "#ffdf88", "#ff7aa2", "#7dffb3", "#c58bff", "#ffa94f"]);

  const lightScale = d3.scaleLinear().domain([1, 5, 10]).range([0.05, 0.4, 0.85]);
  const satScale   = d3.scaleLinear().domain([1, 5, 10]).range([0.15, 0.6, 1.0]);

  const g = svg.append("g");

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

  let currentZoom = 1;
  const zoomIndicator = document.getElementById("zoom-indicator");

  const zoom = d3.zoom()
    .scaleExtent([0.05, 4])
    .on("zoom", (event) => {
      currentZoom = event.transform.k;
      g.attr("transform", event.transform);
      zoomIndicator.textContent = `Zoom: ${currentZoom.toFixed(2)}×`;

      labels.style("font-size", d => {
        const base =
          d.radius >= 45 ? 15 :
          d.radius >= 25 ? 12 :
          9;
        return `${base / currentZoom}px`;
      });
    });

  svg.call(zoom);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.normId)
      .distance(d => d.source.radius * 2 + d.target.radius * 2 + 1200)
      .strength(1.0)
    )
    .force("charge", d3.forceManyBody().strength(-1800))
    .force("bigPush", d3.forceManyBody().strength(d => -Math.pow(d.radius, 1.7)))
    .force("collision", d3.forceCollide().radius(d => d.radius + 80))
    .force("radial", d3.forceRadial(
      d => d.radius > 40 ? 1200 : 400,
      width / 2,
      height / 2
    ).strength(0.05))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .on("tick", ticked);

  const link = g.append("g")
    .attr("stroke-linecap", "round")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link-line")
    .attr("stroke-width", d => d.primary ? 3 : 1.2)
    .attr("stroke", d => d.primary ? "#4fc3ff" : "rgba(79, 195, 255, 0.25)");

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
      event.stopPropagation();
      highlightNode(d.normId, true);
      startPulses(d.normId);
    })
    .on("mouseout", (event, d) => {
      highlightNode(d.normId, false);
      stopPulses();
    });

  const labels = node.append("text")
    .attr("class", "node-label")
    .text(d => d.name)
    .attr("dy", "0.35em")
    .each(function(d) {
      const label = d3.select(this);
      if (d.radius >= 45) {
        label.attr("text-anchor", "middle").attr("x", 0);
      } else if (d.radius >= 25) {
        label.attr("text-anchor", "start").attr("x", d.radius + 20);
      } else {
        label.attr("text-anchor", "start").attr("x", d.radius + 12);
      }
    });

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

    pulses.forEach(p => {
      const { source, target, circle } = p;
      const t = p.t;
      const x = source.x + (target.x - source.x) * t;
      const y = source.y + (target.y - source.y) * t;
      circle.attr("transform", `translate(${x},${y})`);
    });
  }

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

  function getImmediateRelations(id) {
    const parents = new Set();
    const children = new Set();

    links.forEach(l => {
      if (l.source.normId === id) children.add(l.target.normId);
      if (l.target.normId === id) parents.add(l.source.normId);
    });

    return { parents, children };
  }

  function getSecondaryRelations(immediateSet) {
    const secondary = new Set();

    immediateSet.forEach(mid => {
      links.forEach(l => {
        if (l.source.normId === mid && !immediateSet.has(l.target.normId)) {
          secondary.add(l.target.normId);
        }
        if (l.target.normId === mid && !immediateSet.has(l.source.normId)) {
          secondary.add(l.source.normId);
        }
      });
    });

    return secondary;
  }

  function highlightNode(normId, on) {
    if (!on) {
      link.classed("highlight", false).attr("stroke-opacity", 1);
      shapes.attr("opacity", 1);
      labels.attr("opacity", 1);
      return;
    }

    const { parents, children } = getImmediateRelations(normId);
    const immediate = new Set([normId, ...parents, ...children]);
    const secondary = getSecondaryRelations(immediate);

    link
      .classed("highlight", d =>
        d.source.normId === normId || d.target.normId === normId
      )
      .attr("stroke-opacity", d => {
        const s = d.source.normId;
        const t = d.target.normId;
        if (immediate.has(s) && immediate.has(t)) return 1.0;
        if (immediate.has(s) || immediate.has(t)) return 0.9;
        if (secondary.has(s) || secondary.has(t)) return 0.4;
        return 0.1;
      });

    shapes.attr("opacity", d => {
      if (immediate.has(d.normId)) return 1.0;
      if (secondary.has(d.normId)) return 0.4;
      return 0.1;
    });

    labels.attr("opacity", d => {
      if (immediate.has(d.normId)) return 1.0;
      if (secondary.has(d.normId)) return 0.4;
      return 0.1;
    });
  }

  const pulses = [];
  let pulseTimer = null;

  function startPulses(normId) {
    stopPulses();

    const primaryLinks = links.filter(
      l => l.primary && (l.source.normId === normId || l.target.normId === normId)
    );

    primaryLinks.forEach(l => {
      const source = l.source;
      const target = l.target;
      const circle = g.append("circle")
        .attr("r", 3)
        .attr("fill", "#4fc3ff")
        .attr("opacity", 0.9);

      pulses.push({ source, target, circle, t: 0 });
    });

    const duration = 2500;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const frac = (elapsed % duration) / duration;

      pulses.forEach(p => {
        p.t = frac;
      });

      pulseTimer = requestAnimationFrame(step);
    }

    pulseTimer = requestAnimationFrame(step);
  }

  function stopPulses() {
    if (pulseTimer) {
      cancelAnimationFrame(pulseTimer);
      pulseTimer = null;
    }
    pulses.forEach(p => p.circle.remove());
    pulses.length = 0;
  }

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

    shapes
      .filter(d => d.normId === node.normId)
      .transition()
      .duration(200)
      .attr("stroke-width", 4)
      .transition()
      .duration(200)
      .attr("stroke-width", 1.5);
  }

  document.getElementById("recenter-btn").onclick = () => {
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
  };

  window.addEventListener("resize", () => {
    width = window.innerWidth;
    height = window.innerHeight - document.getElementById("tree-container").offsetTop;
    svg.attr("viewBox", [0, 0, width, height]);
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
  });
}
