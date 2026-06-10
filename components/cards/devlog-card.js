export function createDevlogCard(devlog) {
  const card = document.createElement("a");
  card.className = "card";
  card.href = `/devlogs/devlog.html?id=${devlog.id}`;

  const thumb = document.createElement("img");
  thumb.className = "card-thumb";
  thumb.src = devlog.thumbnail || "/assets/default-thumb.png";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = devlog.title;

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = devlog.date
    ? new Date(devlog.date).toLocaleDateString()
    : "";

  body.appendChild(title);
  body.appendChild(sub);

  card.appendChild(thumb);
  card.appendChild(body);

  return card;
}
