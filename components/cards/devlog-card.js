// Version: v0.2.4.2.0

export function createDevlogCard(devlog) {
  // Match the devlog card appearance used on the project page
  const card = document.createElement("a");
  card.className = "devlog-card";
  card.href = `/devlogs/devlog.html?id=${devlog.id}`;

  const thumb = window.createThumbnailMedia
    ? window.createThumbnailMedia(devlog.thumbnail, devlog.title, "devlog-thumb", { playOnHover: true })
    : document.createElement("img");

  if (!window.createThumbnailMedia) {
    thumb.className = "devlog-thumb";
    thumb.src = devlog.thumbnail || "/assets/BlueFire_Logo_square.png";
  }

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
