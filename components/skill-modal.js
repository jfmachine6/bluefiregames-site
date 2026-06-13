// Version: v0.2.4.5.0

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

export function initSkillModal() {
  const overlay = document.getElementById("skill-modal-overlay");
  const closeBtn = document.getElementById("skill-modal-close");

  closeBtn.onclick = closeSkillModal;

  overlay.onclick = e => {
    if (e.target.id === "skill-modal-overlay") closeSkillModal();
  };
}

export async function openSkillModal(id) {
  const overlay = document.getElementById("skill-modal-overlay");

  await ensureGlobalData();

  const allSkills = window.__ALL_SKILLS__ || [];
  const allDevlogs = window.__ALL_DEVLOGS__ || [];
  const allProjects = window.__ALL_PROJECTS__ || [];
  const allTasks = window.__ALL_TASKS__ || [];

  const skill = allSkills.find(s => s.id === id);
  if (!skill) {
    console.warn("Skill not found in loaded skill data.");
    return;
  }

  document.getElementById("skill-modal-name").textContent = skill.name;
  document.getElementById("skill-modal-meta").textContent =
    `${skill.category} • ${skill.type} • Level ${skill.level ?? "?"}`;

  document.getElementById("skill-modal-description").textContent =
    skill.description || "";

  const themeBox = document.getElementById("skill-modal-themes");
  themeBox.innerHTML = "";
  (skill.themes || []).forEach(t => {
    const pill = document.createElement("div");
    pill.className = "skill-modal-theme-pill";
    pill.textContent = t;
    themeBox.appendChild(pill);
  });

  const linksBox = document.getElementById("skill-modal-links");
  linksBox.innerHTML = "";

  // Examples
  if (skill.examples && skill.examples.trim().length > 0) {
    linksBox.appendChild(sectionHeader("Examples"));

    const list = document.createElement("ul");
    list.className = "skill-modal-examples-list";

    skill.examples
      .split(/[\n;]+/)
      .map(x => x.trim())
      .filter(x => x.length)
      .forEach(ex => {
        const li = document.createElement("li");
        li.textContent = ex;
        list.appendChild(li);
      });

    linksBox.appendChild(list);
  }

  // Projects (vertical list)
  if (skill.projects?.length && allProjects) {
    linksBox.appendChild(sectionHeader("Projects"));

    const list = document.createElement("div");
    list.className = "skill-modal-project-list";

    skill.projects.forEach(pid => {
      const project = allProjects.find(p => p.id === pid);
      if (project) list.appendChild(createProjectCard(project));
    });

    linksBox.appendChild(list);
  }

  // Devlogs (grid)
  if (skill.devlogs?.length && allDevlogs) {
    linksBox.appendChild(sectionHeader("Devlogs"));

    const grid = document.createElement("div");
    grid.className = "skill-modal-grid";

    skill.devlogs.forEach(did => {
      const devlog = allDevlogs.find(d => d.id === did);
      if (devlog) grid.appendChild(createDevlogCard(devlog));
    });

    linksBox.appendChild(grid);
  }

  // Tasks (vertical) — fetch full task details so devlog counts are accurate
  if (skill.tasks?.length) {
    linksBox.appendChild(sectionHeader("Tasks"));

    // Resolve tasks in parallel, preferring the preloaded `allTasks` entry
    const tasksResolved = await Promise.all(
      skill.tasks.map(async tid => {
        let task = allTasks ? allTasks.find(t => t.id === tid) : null;
        try {
          // Always request the full task endpoint to get its `devlogs` list
          const res = await fetch(`${WORKER}/task?id=${tid}`);
          if (res.ok) {
            const full = await res.json();
            // Merge any preloaded fields with the full response
            task = { ...(task || {}), ...full };
          }
        } catch (e) {
          // network failure — fallback to preloaded task
        }
        return task;
      })
    );

    tasksResolved.forEach(task => {
      if (task) linksBox.appendChild(createTaskCard(task, allDevlogs));
    });
  }

  // Family Tree
  if (skill.parentSkills?.length) {
    linksBox.appendChild(sectionHeader("Ancestor Tree"));
    linksBox.appendChild(createParentSkillTree(skill, allSkills));
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";
}

function buildAncestorRows(skill, allSkills) {
  const rows = [];
  const seen = new Set();
  let currentIds = (skill.parentSkills || []).filter(Boolean);

  while (currentIds.length) {
    const parents = currentIds
      .map(pid => allSkills.find(s => s.id === pid))
      .filter(Boolean);

    if (!parents.length) break;

    const parentIds = parents.map(p => p.id);
    if (rows.some(row => row.length === parentIds.length && row.every((r, idx) => r.id === parentIds[idx]))) {
      break;
    }

    rows.push(parents);
    parents.forEach(p => seen.add(p.id));

    currentIds = parents
      .flatMap(p => p.parentSkills || [])
      .filter(pid => pid && !seen.has(pid));
  }

  return rows.reverse();
}

function createParentSkillTree(skill, allSkills) {
  const rows = buildAncestorRows(skill, allSkills);
  const tree = document.createElement("div");
  tree.className = "skill-modal-parent-tree";

  if (!rows.length) {
    const none = document.createElement("div");
    none.className = "skill-modal-parent-none";
    none.textContent = "No parent skills available.";
    tree.appendChild(none);
    return tree;
  }

  rows.forEach((row, rowIndex) => {
    const rowEl = document.createElement("div");
    rowEl.className = "skill-modal-parent-row";

    row.forEach(parent => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "skill-modal-parent-node";
      node.textContent = parent.name;
      node.onclick = () => openSkillModal(parent.id);
      rowEl.appendChild(node);
    });

    tree.appendChild(rowEl);
  });

  const currentRow = document.createElement("div");
  currentRow.className = "skill-modal-parent-row current";

  const currentNode = document.createElement("button");
  currentNode.type = "button";
  currentNode.className = "skill-modal-parent-node skill-modal-current-node";
  currentNode.textContent = skill.name;
  currentNode.onclick = () => openSkillModal(skill.id);

  currentRow.appendChild(currentNode);
  tree.appendChild(currentRow);

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
