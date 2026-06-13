// Version: v0.2.4.5.3

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

function buildAncestorLevels(skill, allSkills) {
  const levels = [];
  const seen = new Set();
  let currentLevel = (skill.parentSkills || []).filter(Boolean);

  while (currentLevel.length) {
    const levelSkills = currentLevel
      .map(id => allSkills.find(s => s.id === id))
      .filter(Boolean);

    if (!levelSkills.length) break;

    const uniqueIds = new Set(levelSkills.map(s => s.id));
    if (levels.some(level => 
      level.length === uniqueIds.size && 
      level.every(s => uniqueIds.has(s.id))
    )) {
      break;
    }

    levels.push(levelSkills);
    levelSkills.forEach(s => seen.add(s.id));

    currentLevel = levelSkills
      .flatMap(s => s.parentSkills || [])
      .filter(id => id && !seen.has(id));
  }

  return levels.reverse();
}

function createParentSkillTree(skill, allSkills) {
  const tree = document.createElement("div");
  tree.className = "skill-modal-parent-tree";

  const levels = buildAncestorLevels(skill, allSkills);

  if (!levels.length) {
    const none = document.createElement("div");
    none.className = "skill-modal-parent-none";
    none.textContent = "No parent skills.";
    tree.appendChild(none);
    return tree;
  }

  // Render ancestor levels
  levels.forEach(levelSkills => {
    const levelEl = document.createElement("div");
    levelEl.className = "skill-modal-tree-level";

    levelSkills.forEach(parent => {
      const nodeEl = document.createElement("div");
      nodeEl.className = "skill-modal-tree-node";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-modal-parent-node";
      btn.textContent = parent.name;
      btn.onclick = () => openSkillModal(parent.id);
      nodeEl.appendChild(btn);
      levelEl.appendChild(nodeEl);
    });

    tree.appendChild(levelEl);
  });

  // Render current skill at bottom
  const currentLevel = document.createElement("div");
  currentLevel.className = "skill-modal-tree-level";
  const currentNode = document.createElement("div");
  currentNode.className = "skill-modal-tree-node current";

  const currentBtn = document.createElement("button");
  currentBtn.type = "button";
  currentBtn.className = "skill-modal-parent-node";
  currentBtn.textContent = skill.name;
  currentBtn.disabled = true;
  currentNode.appendChild(currentBtn);
  currentLevel.appendChild(currentNode);
  tree.appendChild(currentLevel);

  return tree;
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
