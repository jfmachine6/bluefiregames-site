const WORKER = "https://bluefire-notion.jfedders6.workers.dev";

export async function initSkillTree() {
  const svg = d3.select("#tree-svg");
  const width = window.innerWidth;
  const height = window.innerHeight;

  svg.attr("viewBox", [0, 0, width, height]);

  // Fetch skills
  const res = await fetch(`${WORKER}/skills`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });

  const skills = await res.json();
  document.getElementById("tree-loader").style.display = "none";

  // Build nodes
  const nodes = skills.map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    type: s.type,
    level: s.level,
    parentSkills: s.parentSkills || []
  }));

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // Build links (parent → child)
  const links = [];
  skills.forEach(s => {
    (s.parentSkills || []).forEach((parentId, index) => {
      if (nodeById.has(parentId)) {
        links.push({
          source: parentId,
          target: s.id,
          primary: index === 0 // first parent = primary
        });
      } else {
        console.warn("Missing parent:", parentId, "for child:", s.id);
      }
    });
  });

  // Category color scale
  const colorByCategory = d3.scaleOrdinal()
    .domain([...new Set(nodes.map(n => n.category))])
    .range(["#4fc3ff", "#ffdf88", "#ff7aa2", "#7dffb3", "#c58bff", "#ffa94f"]);

  const g = svg.append("g");

  // Arrowhead marker for direction (parent → child)
  const defs = svg.append("defs");
  defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 16)
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

  // Simulation (more spacing, less clutter)
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(120).strength(0.9))
    .force("charge", d3.forceManyBody().strength(-350))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => 20 + (d.level || 1)))
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

  // Nodes
  const node = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(drag(simulation));

  const circles = node.append("circle")
    .attr("class", "node-circle")
    .attr("r", d => isCoreSkill(d) ? 18 : 8 + (d.level || 1) * 1.2)
    .attr("fill", d => colorByCategory(d.category))
    .on("click", (event, d) => {
      event.stopPropagation();
      if (window.openSkillModal) {
        window.openSkillModal(d.id);
      }
    })
    .on("mouseover", (event, d) => {
      highlightNode(d.id, true);
    })
    .on("mouseout", (event, d) => {
      highlightNode(d.id, false);
    });

  const labels = node.append("text")
    .attr("class", "node-label")
    .attr("x", 10)
    .attr("y", 3)
    .text(d => d.name);

  // Core skill = no parents
  function isCoreSkill(d) {
    return !d.parentSkills || d.parentSkills.length === 0;
  }

  // Tick update
  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

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

  // Highlight connected links + fade others
  function highlightNode(id, on) {
    const connectedIds = new Set([id]);

    links.forEach(l => {
      if (l.source.id === id) connectedIds.add(l.target.id);
      if (l.target.id === id) connectedIds.add(l.source.id);
    });

    link
      .classed("highlight", d => on && (d.source.id === id || d.target.id === id))
      .attr("stroke-opacity", d => {
        if (!on) return 1;
        return (d.source.id === id || d.target.id === id) ? 1 : 0.1;
      });

    node
      .selectAll("circle")
      .attr("opacity", d => {
        if (!on) return 1;
        return connectedIds.has(d.id) ? 1 : 0.2;
      });

    node
      .selectAll("text")
      .attr("opacity", d => {
        if (!on) return 1;
        return connectedIds.has(d.id) ? 1 : 0.15;
      });
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
