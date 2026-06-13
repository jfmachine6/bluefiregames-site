// Version: v0.2.4.1.0

export function createDevlogCard(devlog) {
  // Match the devlog card appearance used on the project page
  const card = document.createElement("a");
  card.className = "devlog-card";
  card.href = `/devlogs/devlog.html?id=${devlog.id}`;

  const thumb = document.createElement("img");
  thumb.className = "devlog-thumb";
  thumb.src = devlog.thumbnail || "/assets/default-thumb.png";

  const title = document.createElement("div");
  title.className = "devlog-title";
  title.textContent = devlog.title || "Untitled";

  const date = document.createElement("div");
  date.className = "devlog-date";
  date.textContent = devlog.date
    ? new Date(devlog.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  card.appendChild(thumb);
  card.appendChild(title);
  card.appendChild(date);

  return card;
}
