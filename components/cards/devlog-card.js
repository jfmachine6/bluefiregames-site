export function createDevlogCard(devlog) {
  const card = document.createElement("a");
  card.className = "devlog-card";
  card.href = `/devlogs/devlog.html?id=${devlog.id}`;

  const thumb = document.createElement("img");
  thumb.className = "devlog-thumb";
  thumb.src = devlog.thumbnail || "/assets/default-thumb.png";

  const title = document.createElement("div");
  title.className = "devlog-title";
  title.textContent = devlog.title;

  const date = document.createElement("div");
  date.className = "devlog-date";
  date.textContent = new Date(devlog.date).toLocaleDateString();

  card.appendChild(thumb);
  card.appendChild(title);
  card.appendChild(date);

  return card;
}
