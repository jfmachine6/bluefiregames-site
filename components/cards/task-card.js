// Version: v0.2.4.1.0

export function createTaskCard(task, allDevlogs = []) {
  const card = document.createElement("a");
  card.className = "card";
  card.href = `/tasks/task.html?id=${task.id}`;

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = task.title || "Untitled Task";

  // Determine devlog count from multiple possible shapes:
  // 1) task.devlogs (returned by /task?id=)
  // 2) task.sessions (array of relation objects from project context)
  // 3) allDevlogs entries that reference this task via devlog.task?.id or devlog.taskId
  let count = 0;

  if (Array.isArray(task.devlogs)) {
    count = task.devlogs.length;
  } else if (Array.isArray(task.sessions) && task.sessions.length) {
    // sessions may be relation objects with id fields
    const sessIds = task.sessions.map(s => (s.id || s).toString().replace(/-/g, ""));
    count = allDevlogs.filter(d => sessIds.includes((d.id || "").toString())).length;
  } else if (Array.isArray(allDevlogs) && allDevlogs.length) {
    // try devlog.task or taskId fields
    count = allDevlogs.filter(d => {
      const tid = (d.task && d.task.id) || d.taskId || d.task || null;
      if (!tid) return false;
      return tid.toString().replace(/-/g, "") === task.id.toString().replace(/-/g, "");
    }).length;
  }

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = `${count} Devlogs`;

  body.appendChild(title);
  body.appendChild(sub);

  card.appendChild(body);

  return card;
}
