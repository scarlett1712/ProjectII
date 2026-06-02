"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import Image from "next/image";
import { StarBackground } from "@/components/StarBackground";
import { DraggableStar } from "@/components/DraggableStar";
import { WelcomeLoading } from "@/components/WelcomeLoading";

function LoginContent() {
  const { data, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "USER" | "ASSISTANT"; content: string }>>([
    { role: "ASSISTANT", content: "Xin chào! Mình là Star. Bạn cần hỗ trợ đăng nhập chỗ nào không?" },
  ]);
  const [showLoading, setShowLoading] = useState(false);

  const justRegistered = searchParams.get("registered") === "1";

  useEffect(() => {
    if (status === "authenticated" && data?.user?.id) router.push("/dashboard");
  }, [data?.user?.id, router, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (res?.error) { setError("Email hoặc mật khẩu không đúng."); return; }
      
      setShowLoading(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2500);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendChat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content || chatLoading) return;
    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: "USER", content }]);
    setChatInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = (await res.json().catch(() => ({}))) as { reply?: { content?: string }; error?: string };
      const replyText = body.reply?.content ?? (res.ok ? "Mình nhận tin nhắn rồi, nhưng chưa thể phản hồi lúc này." : `Mình tạm thời chưa xử lý được. ${body.error ?? "Bạn thử lại giúp mình nhé."}`);
      setChatMessages((prev) => [...prev, { role: "ASSISTANT", content: replyText }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "ASSISTANT", content: "Đường truyền đang gián đoạn, bạn thử gửi lại sau vài giây nhé." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[420px] rounded-[28px] bg-white p-8 shadow-[0_20px_60px_rgba(100,70,180,0.18)]">
          <h1 className="mb-1 text-center text-3xl font-bold text-[#A172FD]">Đăng nhập</h1>
          <p className="mb-7 text-center text-sm text-[#9ca3af]">Bạn đã quay lại rồi! Star nhớ bạn lắm đó.</p>

          {justRegistered && (
            <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Đăng ký thành công. Bạn có thể đăng nhập bên dưới.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#374151]">Email *</label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="star1712@gmail.com"
                className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 text-sm text-[#374151] placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50 font-semibold"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#374151]">Mật khẩu *</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-transparent bg-[#f0ecff] px-4 py-2.5 pr-10 text-sm text-[#374151] placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50 font-semibold"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#A172FD]">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-1 w-full rounded-xl bg-[#A172FD] py-2.5 font-semibold text-white transition hover:bg-[#6d28d9] disabled:opacity-60">
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#6b7280]">
            Chưa thuộc về nhau?{" "}
            <Link href="/register" className="font-semibold text-[#A172FD] hover:underline">Đăng ký</Link>
          </p>
        </div>
      </div>

      <DraggableStar onClick={() => setChatOpen((v) => !v)}>
        {chatOpen && (
          <div className="w-[300px] rounded-2xl border border-[#d8cffd] bg-white/95 p-4 shadow-[0_14px_34px_rgba(89,64,156,0.25)] backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#A172FD]">Star Chatbot</p>
              <button type="button" onClick={() => setChatOpen(false)} className="text-xs text-[#9ca3af] hover:text-[#374151]">Đóng</button>
            </div>
            <div className="mb-3 max-h-48 space-y-3 overflow-y-auto rounded-xl bg-[#f5f3ff] p-3 text-sm scrollbar-thin">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "USER" ? "items-end" : "items-start"} space-y-0.5`}>
                  <span className="text-[9px] font-bold text-[#A172FD] opacity-75">
                    {msg.role === "USER" ? "Bạn" : "Bé Sao ⭐"}
                  </span>
                  <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs shadow-sm leading-relaxed ${
                    msg.role === "USER" 
                      ? "bg-[#6D28D9] text-white font-bold rounded-tr-none" 
                      : "bg-white text-gray-800 rounded-tl-none border border-purple-50"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat}>
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder="Hỏi cách đăng nhập..."
                className="w-full rounded-lg border border-[#e9d5ff] bg-white px-3 py-2 text-sm text-purple-950 placeholder:text-purple-400 outline-none focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/40 font-semibold"
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()}
                className="mt-2 w-full rounded-lg bg-[#A172FD] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                {chatLoading ? "Star đang trả lời..." : "Gửi"}
              </button>
            </form>
          </div>
        )}
      </DraggableStar>

      {showLoading && <WelcomeLoading />}
    </StarBackground>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải...</div>}>
      <LoginContent />
    </Suspense>
  );
}
