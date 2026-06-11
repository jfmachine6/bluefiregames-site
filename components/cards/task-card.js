export function createTaskCard(task, allDevlogs) {
  const card = document.createElement("a");
  card.className = "card";
  card.href = `/tasks/task.html?id=${task.id}`;

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = task.title;

  // Count devlogs belonging to this task
  const count = allDevlogs.filter(d => d.taskId === task.id).length;

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = `${count} Devlogs`;

  body.appendChild(title);
  body.appendChild(sub);

  card.appendChild(body);

  return card;
}
