export function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.padding = "12px 14px"; // slightly tighter
  card.onclick = () => {
    // Future: open task modal or navigate to task page
    console.log("Task clicked:", task.id);
  };

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = task.name;

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = task.summary || "";

  body.appendChild(title);
  if (task.summary) body.appendChild(sub);

  card.appendChild(body);

  return card;
}
