export function createTaskCard(task) {
  const card = document.createElement("a");
  card.className = "card";
  card.href = `/tasks/task.html?id=${task.id}`;

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = task.title;

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = task.description || "";

  body.appendChild(title);
  body.appendChild(sub);

  card.appendChild(body);

  return card;
}
