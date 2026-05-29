"use client";

import { useEffect, useState } from "react";

type Task = { id: string; title: string; completed: boolean };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  async function load() {
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
  }

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
          setTitle("");
          await load();
        }}
        className="flex gap-2 rounded border bg-white p-4"
      >
        <input className="w-full rounded border px-2 py-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Them task moi" />
        <button className="rounded bg-indigo-600 px-3 py-1 text-white">Them</button>
      </form>
      <div className="rounded border bg-white p-4">
        {tasks.map((task) => (
          <label key={task.id} className="flex gap-2">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={async (e) => {
                await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, completed: e.target.checked }) });
                await load();
              }}
            />
            {task.title}
          </label>
        ))}
      </div>
    </div>
  );
}
