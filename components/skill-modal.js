// Version: v0.2.4.5.2

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

function buildFullTree(skill, allSkills, depth = 0, seen = new Set()) {
  if (seen.has(skill.id)) return null;
  seen.add(skill.id);

  const node = {
    skill,
    depth,
    children: []
  };

  const parentIds = (skill.parentSkills || []).filter(Boolean);
  for (const parentId of parentIds) {
    const parent = allSkills.find(s => s.id === parentId);
    if (parent) {
      const childNode = buildFullTree(parent, allSkills, depth + 1, new Set(seen));
      if (childNode) node.children.push(childNode);
    }
  }

  return node;
}

function createParentSkillTree(skill, allSkills) {
  const tree = document.createElement("div");
  tree.className = "skill-modal-parent-tree";

  const root = buildFullTree(skill, allSkills);

  if (!root || !root.children.length) {
    const none = document.createElement("div");
    none.className = "skill-modal-parent-none";
    none.textContent = "No parent skills.";
    tree.appendChild(none);
  } else {
    function renderBranch(node) {
      for (const child of node.children) {
        const nodeEl = document.createElement("div");
        nodeEl.className = "skill-modal-tree-node";
        nodeEl.style.setProperty("--depth", (child.depth * 24) + "px");

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skill-modal-parent-node";
        btn.textContent = child.skill.name;
        btn.onclick = () => openSkillModal(child.skill.id);
        nodeEl.appendChild(btn);
        tree.appendChild(nodeEl);

        renderBranch(child);
      }
    }

    renderBranch(root);
  }

  const currentEl = document.createElement("div");
  currentEl.className = "skill-modal-tree-node current";
  currentEl.style.setProperty("--depth", "0px");
  const currentBtn = document.createElement("button");
  currentBtn.type = "button";
  currentBtn.className = "skill-modal-parent-node";
  currentBtn.textContent = skill.name;
  currentBtn.disabled = true;
  currentEl.appendChild(currentBtn);
  tree.appendChild(currentEl);

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
