"use client";

import { useEffect, useState } from "react";

type ChatMessage = { id: string; role: "USER" | "ASSISTANT"; content: string };

export function PetAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => setMessages([]));
  }, []);

  async function sendMessage() {
    if (!text.trim()) return;
    const currentText = text;
    setText("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "USER", content: currentText },
    ]);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: currentText }),
    });
    const data = await res.json();
    if (data.reply) {
      setMessages((prev) => [...prev, data.reply]);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 rounded-xl border bg-white shadow-lg">
      <button className="w-full border-b px-3 py-2 text-left font-semibold" onClick={() => setOpen(!open)}>
        Pet Assistant
      </button>
      {open ? (
        <div className="p-3">
          <div className="mb-3 h-56 overflow-y-auto rounded border p-2 text-sm">
            {messages.map((msg) => (
              <p key={msg.id} className={msg.role === "USER" ? "text-slate-900" : "text-indigo-700"}>
                <strong>{msg.role === "USER" ? "You" : "Pet"}:</strong> {msg.content}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhap tin nhan..."
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <button onClick={sendMessage} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">
              Send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
