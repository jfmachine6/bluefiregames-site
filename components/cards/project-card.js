// Version: v0.2.4.2.0

export function createProjectCard(project) {
  // Match the project footer layout used on the devlog page
  const card = document.createElement("a");
  card.className = "project-footer project-card";
  card.href = `/projects/project.html?id=${project.id}`;

  let thumb;
  if (project.thumbnail) {
    thumb = document.createElement("img");
    thumb.className = "project-thumb";
    thumb.src = project.thumbnail;
    thumb.alt = project.title || "Project thumbnail";
  } else {
    thumb = document.createElement("div");
    thumb.className = "project-thumb project-placeholder";
    thumb.setAttribute("role", "img");
    thumb.setAttribute("aria-label", `${project.title || "Project"} thumbnail coming soon`);

    const logo = document.createElement("img");
    logo.className = "project-placeholder-logo";
    logo.src = "/assets/BlueFire_Logo_square.png";
    logo.alt = "";

    const label = document.createElement("span");
    label.className = "project-placeholder-label";
    label.textContent = "Coming Soon...";

    thumb.appendChild(logo);
    thumb.appendChild(label);
  }

  const info = document.createElement("div");
  info.className = "project-info";

  const title = document.createElement("h2");
  title.textContent = project.title || "Untitled";

  const desc = document.createElement("p");
  desc.textContent = project.description || "";

  const link = document.createElement("a");
  link.className = "project-link";
  link.href = `/projects/project.html?id=${project.id}`;
  link.textContent = "View Project";

  info.appendChild(title);
  info.appendChild(desc);
  info.appendChild(link);

  card.appendChild(thumb);
  card.appendChild(info);

  return card;
}
