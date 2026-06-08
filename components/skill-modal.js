const WORKER = "https://bluefire-notion.jfedders6.workers.dev";

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

  // ----------------------------------------
  // INSTANT LOOKUP (no fetch)
  // ----------------------------------------
  const allSkills = window.__ALL_SKILLS__;
  const allDevlogs = window.__ALL_DEVLOGS__;

  if (!allSkills) {
    console.warn("Skill Tree data not loaded yet.");
    return;
  }

  const skill = allSkills.find(s => s.id === id);
  if (!skill) return;

  // ----------------------------------------
  // BASIC INFO
  // ----------------------------------------
  document.getElementById("skill-modal-name").textContent = skill.name;
  document.getElementById("skill-modal-meta").textContent =
    `${skill.category} • ${skill.type} • Level ${skill.level ?? "?"}`;

  document.getElementById("skill-modal-description").textContent =
    skill.description || "";

  // ----------------------------------------
  // THEMES
  // ----------------------------------------
  const themeBox = document.getElementById("skill-modal-themes");
  themeBox.innerHTML = "";
  (skill.themes || []).forEach(t => {
    const pill = document.createElement("div");
    pill.className = "skill-modal-theme-pill";
    pill.textContent = t;
    themeBox.appendChild(pill);
  });

  // ----------------------------------------
  // LINKS SECTION
  // ----------------------------------------
  const linksBox = document.getElementById("skill-modal-links");
  linksBox.innerHTML = "";

  // --- Examples ---
  if (skill.examples && skill.examples.trim().length > 0) {
    linksBox.appendChild(sectionHeader("Examples"));

    const p = document.createElement("p");
    p.className = "skill-modal-examples";
    p.textContent = skill.examples;
    linksBox.appendChild(p);
  }

  // --- Devlogs ---
  if (skill.devlogs?.length) {
    linksBox.appendChild(sectionHeader("Devlogs"));

    skill.devlogs.forEach(did => {
      const d = allDevlogs?.find(x => x.id === did);

      const link = document.createElement("a");
      link.className = "skill-modal-link";
      link.href = `/devlogs/devlog.html?id=${did}`;
      link.textContent = d?.title || `Devlog ${did}`;
      linksBox.appendChild(link);
    });
  }

  // --- Parent Skills ---
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
