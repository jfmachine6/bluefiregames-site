export function createDevlogCard(devlog) {
  const card = document.createElement("div");
  card.className = "card";
  card.onclick = () => {
    window.location.href = `/devlogs/devlog.html?id=${devlog.id}`;
  };

  const thumb = document.createElement("img");
  thumb.className = "card-thumb";
  thumb.src = devlog.thumbnail || "/assets/default-devlog.png";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = devlog.title;

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = devlog.date || "";

  body.appendChild(title);
  body.appendChild(sub);

  card.appendChild(thumb);
  card.appendChild(body);

  return card;
}
