export function createProjectCard(project) {
  const card = document.createElement("a");
  card.className = "devlog-card"; // same styling as footer card
  card.href = `/projects/project.html?id=${project.id}`;

  const thumb = document.createElement("img");
  thumb.className = "devlog-thumb";
  thumb.src = project.thumbnail || "/assets/default-thumb.png";

  const title = document.createElement("div");
  title.className = "devlog-title";
  title.textContent = project.title;

  const desc = document.createElement("div");
  desc.className = "devlog-date"; // smaller text style
  desc.textContent = project.description;

  card.appendChild(thumb);
  card.appendChild(title);
  card.appendChild(desc);

  return card;
}
