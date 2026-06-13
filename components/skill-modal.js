// Version: v0.2.4.5.5

import { createProjectCard } from "/components/cards/project-card.js";
import { createDevlogCard } from "/components/cards/devlog-card.js";
import { createTaskCard } from "/components/cards/task-card.js";

const WORKER = "https://bluefire-notion.jfedders6.workers.dev";

async function ensureGlobalData() {
  const toLoad = [];

  if (!window.__ALL_SKILLS__) {
    toLoad.push(
      fetch(`${WORKER}/skills`, { method: "GET", mode: "cors", cache: "no-store" })
        .then(res => res.ok ? res.json() : [])
        .then(data => { window.__ALL_SKILLS__ = data; })
        .catch(() => { window.__ALL_SKILLS__ = window.__ALL_SKILLS__ || []; })
    );
  }

  if (!window.__ALL_DEVLOGS__) {
    toLoad.push(
      fetch(`${WORKER}/devlogs`, { method: "GET", mode: "cors", cache: "no-store" })
        .then(res => res.ok ? res.json() : [])
        .then(data => { window.__ALL_DEVLOGS__ = data; })
        .catch(() => { window.__ALL_DEVLOGS__ = window.__ALL_DEVLOGS__ || []; })
    );
  }

  if (!window.__ALL_PROJECTS__) {
    toLoad.push(
      fetch(`${WORKER}/projects`, { method: "GET", mode: "cors", cache: "no-store" })
        .then(res => res.ok ? res.json() : [])
        .then(data => { window.__ALL_PROJECTS__ = data; })
        .catch(() => { window.__ALL_PROJECTS__ = window.__ALL_PROJECTS__ || []; })
    );
  }

  if (!window.__ALL_TASKS__) {
    toLoad.push(
      fetch(`${WORKER}/tasks`, { method: "GET", mode: "cors", cache: "no-store" })
        .then(res => res.ok ? res.json() : [])
        .then(data => { window.__ALL_TASKS__ = data; })
        .catch(() => { window.__ALL_TASKS__ = window.__ALL_TASKS__ || []; })
    );
  }

  if (toLoad.length) {
    await Promise.all(toLoad);
  }
}

export async function openSkillModal(skillId) {
  await ensureGlobalData();

  const skill = window.__ALL_SKILLS__.find(s => s.id === skillId);
  if (!skill) return;

  const overlay = document.getElementById("skill-modal-overlay");
  const modal = document.getElementById("skill-modal");
  const nameEl = document.getElementById("skill-modal-name");
  const metaEl = document.getElementById("skill-modal-meta");
  const descEl = document.getElementById("skill-modal-description");
  const themesEl = document.getElementById("skill-modal-themes");
  const linksBox = document.getElementById("skill-modal-links");

  nameEl.textContent = skill.name || "";
  descEl.textContent = skill.description || "";

  const level = skill.level || "Unknown";
  metaEl.textContent = `Level: ${level}`;

  themesEl.innerHTML = "";
  if (skill.themes && Array.isArray(skill.themes)) {
    skill.themes.forEach(theme => {
      const pill = document.createElement("div");
      pill.className = "skill-modal-theme-pill";
      pill.textContent = theme;
      themesEl.appendChild(pill);
    });
  }

  linksBox.innerHTML = "";

  // Examples
  if (skill.examples && Array.isArray(skill.examples) && skill.examples.length > 0) {
    linksBox.appendChild(sectionHeader("Examples"));
    const list = document.createElement("ul");
    list.className = "skill-modal-examples-list";
    skill.examples.forEach(example => {
      const li = document.createElement("li");
      li.textContent = example;
      list.appendChild(li);
    });
    linksBox.appendChild(list);
  }

  // Devlog cards
  if (skill.devlogsIds && Array.isArray(skill.devlogsIds) && skill.devlogsIds.length > 0) {
    linksBox.appendChild(sectionHeader("Devlogs"));
    const grid = document.createElement("div");
    grid.className = "skill-modal-grid";
    skill.devlogsIds.forEach(did => {
      const devlog = window.__ALL_DEVLOGS__.find(d => d.id === did);
      if (devlog) grid.appendChild(createDevlogCard(devlog));
    });
    linksBox.appendChild(grid);
  }

  // Project cards
  if (skill.projectIds && Array.isArray(skill.projectIds) && skill.projectIds.length > 0) {
    linksBox.appendChild(sectionHeader("Projects"));
    const list = document.createElement("div");
    list.className = "skill-modal-project-list";
    skill.projectIds.forEach(pid => {
      const project = window.__ALL_PROJECTS__.find(p => p.id === pid);
      if (project) list.appendChild(createProjectCard(project));
    });
    linksBox.appendChild(list);
  }

  // Task cards
  if (skill.taskIds && Array.isArray(skill.taskIds) && skill.taskIds.length > 0) {
    linksBox.appendChild(sectionHeader("Tasks"));
    const grid = document.createElement("div");
    grid.className = "skill-modal-grid";
    skill.taskIds.forEach(tid => {
      const task = window.__ALL_TASKS__.find(t => t.id === tid);
      if (task) grid.appendChild(createTaskCard(task));
    });
    linksBox.appendChild(grid);
  }

  // Parent skill tree
  if (skill.parentSkills && skill.parentSkills.length > 0) {
    linksBox.appendChild(sectionHeader("Parent Skills"));
    linksBox.appendChild(createParentSkillTree(skill, window.__ALL_SKILLS__));
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";
}

export function initSkillModal() {
  const closeButton = document.getElementById("skill-modal-close");
  const overlay = document.getElementById("skill-modal-overlay");

  if (closeButton) {
    closeButton.addEventListener("click", closeSkillModal);
  }

  if (overlay) {
    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        closeSkillModal();
      }
    });
  }

  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const overlayEl = document.getElementById("skill-modal-overlay");
      if (overlayEl && overlayEl.classList.contains("visible")) {
        closeSkillModal();
      }
    }
  });
}

function buildAncestorGraph(skill, allSkills) {
  const nodes = new Map();
  const edges = [];

  function getNode(skill) {
    if (!nodes.has(skill.id)) {
      nodes.set(skill.id, { skill, children: [] });
    }
    return nodes.get(skill.id);
  }

  function walk(current) {
    const node = getNode(current);
    const parentIds = (current.parentSkills || []).filter(Boolean);

    parentIds.forEach(parentId => {
      const parentSkill = allSkills.find(s => s.id === parentId);
      if (!parentSkill) return;

      const parentNode = getNode(parentSkill);
      if (!parentNode.children.some(child => child.skill.id === current.id)) {
        parentNode.children.push(node);
      }
      edges.push(`${parentId}->${current.id}`);
      if (!edges.includes(`${current.id}->${parentId}`)) {
        walk(parentSkill);
      }
    });
  }

  walk(skill);

  const rootNodes = [];
  nodes.forEach(node => {
    const parentIds = (node.skill.parentSkills || []).filter(Boolean);
    const hasParentInGraph = parentIds.some(pid => nodes.has(pid));
    if (!hasParentInGraph) {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

function createParentSkillTree(skill, allSkills) {
  const tree = document.createElement("div");
  tree.className = "skill-modal-parent-tree";

  const roots = buildAncestorGraph(skill, allSkills);
  if (!roots.length) {
    const none = document.createElement("div");
    none.className = "skill-modal-parent-none";
    none.textContent = "No parent skills.";
    tree.appendChild(none);
    return tree;
  }

  const list = document.createElement("ul");
  list.className = "skill-modal-parent-list";
  roots.forEach(root => list.appendChild(renderParentNode(root, skill.id)));
  tree.appendChild(list);
  return tree;
}

function renderParentNode(node, currentSkillId) {
  const item = document.createElement("li");
  item.className = "skill-modal-parent-item";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "skill-modal-parent-node";
  btn.textContent = node.skill.name;
  if (node.skill.id === currentSkillId) {
    btn.disabled = true;
    item.classList.add("skill-modal-tree-node", "current");
  } else {
    btn.onclick = () => openSkillModal(node.skill.id);
  }
  item.appendChild(btn);

  if (node.children.length) {
    const sublist = document.createElement("ul");
    sublist.className = "skill-modal-parent-list";
    node.children.forEach(child => sublist.appendChild(renderParentNode(child, currentSkillId)));
    item.appendChild(sublist);
  }

  return item;
}
function sectionHeader(text) {
  const h = document.createElement("div");
  h.className = "skill-modal-section-header";
  h.textContent = text;
  return h;
}

export function closeSkillModal() {
  const overlay = document.getElementById("skill-modal-overlay");
  overlay.classList.remove("visible");
  setTimeout(() => overlay.classList.add("hidden"), 200);
  document.body.style.overflow = "auto";
}
