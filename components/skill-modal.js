import { createProjectCard } from "/components/cards/project-card.js";
import { createDevlogCard } from "/components/cards/devlog-card.js";
import { createTaskCard } from "/components/cards/task-card.js";

export function initSkillModal() {
  const overlay = document.getElementById("skill-modal-overlay");
  const closeBtn = document.getElementById("skill-modal-close");

  closeBtn.onclick = closeSkillModal;

  overlay.onclick = e => {
    if (e.target.id === "skill-modal-overlay") closeSkillModal();
  };
}

export function openSkillModal(id) {
  const overlay = document.getElementById("skill-modal-overlay");

  const allSkills = window.__ALL_SKILLS__;
  const allDevlogs = window.__ALL_DEVLOGS__;
  const allProjects = window.__ALL_PROJECTS__;
  const allTasks = window.__ALL_TASKS__;

  if (!allSkills) {
    console.warn("Skill Tree data not loaded yet.");
    return;
  }

  const skill = allSkills.find(s => s.id === id);
  if (!skill) return;

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

  // Projects (grid)
  if (skill.projects?.length && allProjects) {
    linksBox.appendChild(sectionHeader("Projects"));

    const grid = document.createElement("div");
    grid.className = "skill-modal-grid";

    skill.projects.forEach(pid => {
      const project = allProjects.find(p => p.id === pid);
      if (project) grid.appendChild(createProjectCard(project));
    });

    linksBox.appendChild(grid);
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

  // Tasks (vertical)
  if (skill.tasks?.length && allTasks) {
    linksBox.appendChild(sectionHeader("Tasks"));

    skill.tasks.forEach(tid => {
      const task = allTasks.find(t => t.id === tid);
      if (task) linksBox.appendChild(createTaskCard(task, allDevlogs));
    });
  }

  // Parent Skills
  if (skill.parentSkills?.length) {
    linksBox.appendChild(sectionHeader("Parent Skills"));

    skill.parentSkills.forEach(pid => {
      const parent = allSkills.find(s => s.id === pid);

      const link = document.createElement("a");
      link.className = "skill-modal-link";
      link.href = "#";
      link.onclick = () => openSkillModal(pid);
      link.textContent = parent ? parent.name : pid;
      linksBox.appendChild(link);
    });
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";
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
