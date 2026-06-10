export function createTaskCard(task) {
  const card = document.createElement("a");
  card.className = "devlog-card"; // reuse same card styling
  card.href = `/tasks/task.html?id=${task.id}`;

  const title = document.createElement("div");
  title.className = "devlog-title";
  title.textContent = task.title;

  const desc = document.createElement("div");
  desc.className = "devlog-date";
  desc.textContent = task.description || "";

  card.appendChild(title);
  card.appendChild(desc);

  return card;
}
