const WORKER = "https://bluefire-notion.jfedders6.workers.dev";

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

  const res = await fetch(`${WORKER}/skill/${id}`, {
    method: "GET",
    mode: "cors",
    cache: "no-store"
  });

  const skill = await res.json();

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

  if (skill.devlogs?.length) {
    skill.devlogs.forEach(d => {
      const link = document.createElement("a");
      link.className = "skill-modal-link";
      link.href = `/devlogs/devlog.html?id=${d}`;
      link.textContent = `Devlog: ${d}`;
      linksBox.appendChild(link);
    });
  }

  if (skill.projects?.length) {
    skill.projects.forEach(p => {
      const link = document.createElement("a");
      link.className = "skill-modal-link";
      link.href = `/projects/project.html?id=${p}`;
      link.textContent = `Project: ${p}`;
      linksBox.appendChild(link);
    });
  }

  if (skill.parentSkills?.length) {
    skill.parentSkills.forEach(ps => {
      const link = document.createElement("a");
      link.className = "skill-modal-link";
      link.href = "#";
      link.onclick = () => openSkillModal(ps);
      link.textContent = `Parent Skill: ${ps}`;
      linksBox.appendChild(link);
    });
  }

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";
}

export function closeSkillModal() {
  const overlay = document.getElementById("skill-modal-overlay");
  overlay.classList.remove("visible");
  setTimeout(() => overlay.classList.add("hidden"), 200);
  document.body.style.overflow = "auto";
}
