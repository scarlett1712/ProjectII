"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { StarBackground } from "@/components/StarBackground";
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Steps: 1 = Enter Email, 2 = Enter OTP & New Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Resend cooldown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Step 1: Send OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email của bạn.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể gửi mã xác thực.");
        return;
      }

      setSuccessMsg(data.message);
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setCountdown(60);
      setStep(2);
    } catch {
      setError("Đường truyền gián đoạn. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Vui lòng nhập đúng mã xác thực 6 chữ số.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể đặt lại mật khẩu.");
        return;
      }

      setStep(3);
    } catch {
      setError("Đường truyền gián đoạn. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[440px] rounded-[32px] bg-white p-7 sm:p-9 shadow-[0_20px_60px_rgba(100,70,180,0.18)]">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f3ff] text-2xl shadow-inner">
              {step === 3 ? "🎉" : "🔐"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#A172FD]">
              {step === 1 && "Quên mật khẩu?"}
              {step === 2 && "Xác thực mã bảo mật"}
              {step === 3 && "Đổi mật khẩu thành công!"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#9ca3af]">
              {step === 1 && "Đừng lo, Star sẽ gửi mã bảo mật về email giúp bạn."}
              {step === 2 && `Mã xác thực gồm 6 số đã được gửi tới ${email}`}
              {step === 3 && "Bạn đã có thể đăng nhập ngay với mật khẩu mới."}
            </p>
          </div>

          {/* Dev Hint if running without SMTP */}
          {devOtpHint && step === 2 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="font-bold">Mã xác thực thử nghiệm:</span>{" "}
              <span className="font-mono text-sm font-black tracking-widest text-amber-900">{devOtpHint}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-[#374151]">
                  Địa chỉ Email tài khoản *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A172FD]" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="star1712@gmail.com"
                    className="w-full rounded-xl border border-transparent bg-[#f0ecff] pl-10 pr-4 py-2.5 text-sm text-[#374151] placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-[#A172FD] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8b5cf6] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? "Đang gửi mã..." : "Gửi mã bảo mật"}
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="otp" className="block text-xs font-bold text-[#374151]">
                    Mã xác thực OTP (6 chữ số) *
                  </label>
                  <button
                    type="button"
                    disabled={countdown > 0 || loading}
                    onClick={() => handleSendOtp()}
                    className="text-[11px] font-bold text-[#A172FD] hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {countdown > 0 ? `Gửi lại (${countdown}s)` : "Gửi lại mã"}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A172FD]" />
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-transparent bg-[#f0ecff] pl-10 pr-4 py-2.5 text-base text-center tracking-[6px] font-mono font-black text-[#6d28d9] placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="mb-1.5 block text-xs font-bold text-[#374151]">
                  Mật khẩu mới (tối thiểu 8 ký tự) *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A172FD]" />
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-transparent bg-[#f0ecff] pl-10 pr-10 py-2.5 text-sm text-[#374151] placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af] hover:text-[#A172FD]"
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-bold text-[#374151]">
                  Xác nhận mật khẩu mới *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A172FD]" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-transparent bg-[#f0ecff] pl-10 pr-4 py-2.5 text-sm text-[#374151] placeholder:text-[#9ca3af] outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#c4b5fd]/50 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full rounded-xl bg-[#A172FD] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8b5cf6] disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
              </button>
            </form>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <div className="text-center py-2 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                Mật khẩu của bạn đã được cập nhật thành công!
              </p>
              <Link
                href="/login"
                className="inline-block w-full rounded-xl bg-[#A172FD] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8b5cf6]"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6b7280] hover:text-[#A172FD] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </StarBackground>
  );
}
