"use client";

import { useEffect, useState } from "react";

type WaterData = {
  goal?: { dailyTargetMl: number };
  logs: { id: string; amountMl: number }[];
  slots: { id: string; slotTime: string; amountMl: number }[];
};

export default function WaterPage() {
  const [data, setData] = useState<WaterData>({ logs: [], slots: [] });
  const [target, setTarget] = useState(2000);

  const drank = data.logs.reduce((acc, l) => acc + l.amountMl, 0);

  async function load() {
    const res = await fetch("/api/water");
    const json = await res.json();
    setData(json);
    if (json.goal?.dailyTargetMl) setTarget(json.goal.dailyTargetMl);
  }
  useEffect(() => {
    fetch("/api/water")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json.goal?.dailyTargetMl) setTarget(json.goal.dailyTargetMl);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Water Reminder</h1>
      <div className="rounded border bg-white p-4">
        <p>Muc tieu: {target} ml | Da uong: {drank} ml</p>
        <div className="mt-2 flex gap-2">
          <input className="rounded border px-2 py-1" type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          <button
            onClick={async () => {
              await fetch("/api/water", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "goal", dailyTargetMl: target }) });
              await load();
            }}
            className="rounded bg-indigo-600 px-3 py-1 text-white"
          >
            Cap nhat muc tieu
          </button>
          <button
            onClick={async () => {
              await fetch("/api/water", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountMl: 250 }) });
              await load();
            }}
            className="rounded bg-emerald-600 px-3 py-1 text-white"
          >
            +250ml
          </button>
        </div>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Khung gio nhac</h2>
        {data.slots.map((s) => (
          <p key={s.id}>{s.slotTime} - {s.amountMl}ml</p>
        ))}
      </div>
    </div>
  );
}
