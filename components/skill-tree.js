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
    level: s.level
  }));

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // Build links (parent → child)
  const links = [];
  skills.forEach(s => {
    (s.parentSkills || []).forEach(parentId => {
      if (nodeById.has(parentId)) {
        links.push({ source: parentId, target: s.id });
      }
    });
  });

  // Category color scale
  const colorByCategory = d3.scaleOrdinal()
    .domain([...new Set(nodes.map(n => n.category))])
    .range(["#4fc3ff", "#ffdf88", "#ff7aa2", "#7dffb3", "#c58bff", "#ffa94f"]);

  // Zoom + pan
  const zoom = d3.zoom()
    .scaleExtent([0.3, 2.5])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  const g = svg.append("g");

  // --- IMPORTANT FIX ---
  // Create simulation BEFORE creating nodes or calling drag(simulation)
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(80).strength(0.9))
    .force("charge", d3.forceManyBody().strength(-220))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => 18 + (d.level || 1)))
    .on("tick", ticked);

  // Draw links
  const link = g.append("g")
    .attr("stroke-linecap", "round")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link-line");

  // Draw nodes
  const node = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(drag(simulation)); // simulation now exists

  const circles = node.append("circle")
    .attr("class", "node-circle")
    .attr("r", d => 8 + (d.level || 1) * 1.2)
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

  // Highlight connected links on hover
  function highlightNode(id, on) {
    link.classed("highlight", d => {
      return on && (d.source.id === id || d.target.id === id);
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
