export function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "card";
  card.onclick = () => {
    window.location.href = `/projects/project.html?id=${project.id}`;
  };

  const thumb = document.createElement("img");
  thumb.className = "card-thumb";
  thumb.src = project.thumbnail || "/assets/default-project.png";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = project.name;

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = project.summary || "";

  body.appendChild(title);
  body.appendChild(sub);

  card.appendChild(thumb);
  card.appendChild(body);

  return card;
}
