// Version: v0.2.4.1.0

export function createProjectCard(project) {
  // Match the project footer layout used on the devlog page
  const card = document.createElement("a");
  card.className = "project-footer project-card";
  card.href = `/projects/project.html?id=${project.id}`;

  const thumb = document.createElement("img");
  thumb.className = "project-thumb";
  thumb.src = project.thumbnail || "/assets/default-thumb.png";

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
