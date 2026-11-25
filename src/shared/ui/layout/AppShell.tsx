"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { User as UserIcon } from "lucide-react";
import { StarBackground } from "@/shared/ui/StarBackground";
import { ChangePasswordModal, type PasswordFormValues } from "@/shared/ui/layout/ChangePasswordModal";
import { ProfileModal } from "@/shared/ui/layout/ProfileModal";
import { useDeviceNotifications } from "@/shared/ui/layout/hooks/useDeviceNotifications";
import { useReminderPolling } from "@/shared/ui/layout/hooks/useReminderPolling";
import type { ProfileFormValues } from "@/shared/ui/layout/ProfileEditForm";
import { API_ROUTES, ROUTES, isRouteActive } from "@/shared/config/routes";
import { apiRequest } from "@/shared/client/api";
import { PASSWORD_MIN_LENGTH } from "@/shared/domain/accountPolicy";
import { useKeyboardOpen } from "@/shared/ui/layout/hooks/useKeyboardOpen";
import { useSessionGuard } from "@/shared/ui/layout/hooks/useSessionGuard";
import { useAvatarUpload } from "@/shared/ui/layout/hooks/useAvatarUpload";
import { QuickChat } from "@/shared/ui/layout/QuickChat";
import { GlobalSearch } from "@/shared/ui/layout/GlobalSearch";
import { NotificationBell } from "@/shared/ui/layout/NotificationBell";
import { MobileBottomNav } from "@/shared/ui/layout/MobileBottomNav";
import { Sidebar } from "@/shared/ui/layout/Sidebar";
import { UserSettingsProvider } from "@/shared/client/settingsContext";

/** Page-specific header title and subtitle. */
const pageHeaders = [
  { route: ROUTES.dashboard, titleKey: "nav.dashboard", subtitleKey: "header.subtitle.dashboard" },
  { route: ROUTES.nutrition, titleKey: "nav.nutrition", subtitleKey: "header.subtitle.nutrition" },
  { route: ROUTES.calendar, titleKey: "nav.calendar", subtitleKey: "header.subtitle.calendar" },
  { route: ROUTES.budget, titleKey: "nav.budget", subtitleKey: "header.subtitle.budget" },
  { route: ROUTES.chat, titleKey: "header.chatTitle", subtitleKey: "header.subtitle.chat" },
] as const;

const EMPTY_PASSWORD_FORM: PasswordFormValues = { currentPw: "", newPw: "", confirmPw: "" };
/** Close the password change modal after showing the success message. */
const PASSWORD_SUCCESS_CLOSE_MS = 1500;
export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const tApp = useTranslations("app");
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");
  const { data: session, update: updateSession } = useSession();
  const userId = session?.user?.id;
  const pwCloseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(pwCloseTimer.current), []);
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Change Password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState<PasswordFormValues>(EMPTY_PASSWORD_FORM);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    const { currentPw, newPw, confirmPw } = pwForm;

    if (!currentPw) {
      setPwError(tShell("changePassword.currentRequired"));
      return;
    }

    if (newPw.length < PASSWORD_MIN_LENGTH) {
      setPwError(tc("auth.newPasswordTooShort"));
      return;
    }

    if (newPw !== confirmPw) {
      setPwError(tc("auth.passwordMismatch"));
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch(API_ROUTES.auth.changePassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || tShell("changePassword.failed"));
        return;
      }
      setPwSuccess(tc("auth.passwordChanged"));
      setPwForm(EMPTY_PASSWORD_FORM);
      clearTimeout(pwCloseTimer.current);
      pwCloseTimer.current = setTimeout(() => {
        setShowChangePassword(false);
        setPwSuccess(null);
      }, PASSWORD_SUCCESS_CLOSE_MS);
    } catch {
      setPwError(tShell("changePassword.connectionError"));
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    const onOpenChangePw = () => setShowChangePassword(true);
    window.addEventListener("open-change-password", onOpenChangePw);
    return () => window.removeEventListener("open-change-password", onOpenChangePw);
  }, []);
  const pageHeader = pageHeaders.find(({ route }) => isRouteActive(pathname, route));
  const isKeyboardOpen = useKeyboardOpen();
  const handleSignOut = useSessionGuard();
  const deviceNotifications = useDeviceNotifications();
  // Edit profile states
  const [editForm, setEditForm] = useState<ProfileFormValues>({
    name: "",
    gender: "MALE",
    age: "",
    weight: "",
    height: "",
    activity: "SEDENTARY",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const { userAvatar, isUploadingAvatar, handleAvatarFileSelected } = useAvatarUpload(profile?.image);
  useEffect(() => {
    if (userId) {
      apiRequest<typeof profile>(API_ROUTES.profile)
        .then(setProfile)
        .catch(() => undefined);
    }
  }, [userId]);
  useEffect(() => {
    if (profile) {
      setEditForm({
        name: session?.user?.name || "",
        gender: profile.gender || "MALE",
        age: profile.age ? String(profile.age) : "",
        weight: profile.weightKg ? String(profile.weightKg) : "",
        height: profile.heightCm ? String(profile.heightCm) : "",
        activity: profile.activityLevel || "SEDENTARY",
      });
    }
  }, [profile, session?.user?.name]);

  useReminderPolling(userId ?? null);
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(API_ROUTES.profile, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          gender: editForm.gender,
          age: editForm.age ? Number(editForm.age) : null,
          weightKg: editForm.weight ? Number(editForm.weight) : null,
          heightCm: editForm.height ? Number(editForm.height) : null,
          activityLevel: editForm.activity
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setIsEditingProfile(false);
        if (updateSession) {
          await updateSession();
        }
        // Reload to sync user session name
        window.location.reload();
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  return (
    <UserSettingsProvider>
    <StarBackground>
      <div className="flex h-[100dvh] items-center justify-center p-0 md:p-8 overflow-hidden">
        {/* Main Inner Frame */}
        <div className="relative flex h-full md:h-[90vh] w-full max-w-[1440px] overflow-hidden rounded-none md:rounded-6xl bg-white/80 shadow-modal backdrop-blur-xl">
          {/* Sidebar */}
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(prev => !prev)} userAvatar={userAvatar} onProfile={() => setShowProfile(true)}
            onPassword={() => setShowChangePassword(true)} onSignOut={() => handleSignOut(ROUTES.login)} />
          {/* Main Content Area */}
          <main className={`flex-1 overflow-y-auto bg-primary-soft/30 p-3 sm:p-6 md:p-8 ${isKeyboardOpen ? "pb-4" : "pb-28 sm:pb-32"} md:pb-8 transition-all duration-300 flex flex-col overscroll-contain`}>
            <div className={`mx-auto w-full flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "max-w-7xl" : "max-w-6xl"}`}>

              {/* Global Top Header Bar */}
              <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 xl:gap-4 mb-4 md:mb-8 pt-[max(env(safe-area-inset-top),0.75rem)] md:pt-0 pb-3 md:pb-4 border-b border-purple-100/50 shrink-0">
                {/* When small or half screen: Title on row 1, Subtitle on row 2. When xl+ (full screen): Title and Subtitle inline on row 1 */}
                <div className="flex flex-col xl:flex-row xl:items-baseline gap-0.5 xl:gap-2 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-primary-ink capitalize tracking-tight shrink-0">
                    {pageHeader ? tShell(pageHeader.titleKey) : tApp("name")}
                  </h1>
                  <span className="text-gray-300 hidden xl:inline">{tShell("header.separator")}</span>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                    {tShell(pageHeader?.subtitleKey ?? "header.subtitle.fallback")}
                  </p>
                </div>

                {/* When small or half screen: Search bar + Notifications on row 3. When xl+: on the right side of header */}
                <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end shrink-0">
                  {/* Notification permission prompt button */}
                  {deviceNotifications.permission !== "granted" && deviceNotifications.permission !== "unsupported" && (
                    <button
                      onClick={deviceNotifications.enable}
                      className="flex items-center gap-1.5 rounded-full bg-yellow-50 hover:bg-yellow-100 px-3.5 py-1.5 text-caption font-black text-yellow-700 transition-all border border-yellow-200 shadow-sm animate-pulse cursor-pointer shrink-0"
                      title={tShell("header.enableNotificationsTitle")}
                    >
                      <span>{tShell("header.enableNotifications")}</span>
                    </button>
                  )}

                  <GlobalSearch />
                  <NotificationBell deviceNotifications={deviceNotifications} />
                  {/* Mobile Profile Avatar Button */}
                  <button
                    onClick={() => setShowProfile(true)}
                    className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md active:scale-95 overflow-hidden cursor-pointer"
                    title={tShell("header.profileTitle")}
                    aria-label={tShell("header.profileAria")}
                  >
                    {userAvatar ? (
                      <img src={userAvatar} alt={tShell("sidebar.avatarAlt")} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </header>

              <div className="flex-1">
                {children}
              </div>
            </div>
          </main>

          {!isKeyboardOpen && <MobileBottomNav />}
        </div>

        <ProfileModal
          open={showProfile}
          onClose={() => { setShowProfile(false); setIsEditingProfile(false); }}
          userName={session?.user?.name || tc("app.defaultUserName")}
          profile={profile}
          avatarUrl={userAvatar}
          isUploadingAvatar={isUploadingAvatar}
          onAvatarFileSelected={handleAvatarFileSelected}
          isEditing={isEditingProfile}
          onStartEdit={() => setIsEditingProfile(true)}
          onCancelEdit={() => setIsEditingProfile(false)}
          form={editForm}
          onFormChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
          onSubmitForm={handleSaveProfile}
          onChangePassword={() => { setShowProfile(false); setShowChangePassword(true); }}
          onSignOut={() => handleSignOut(ROUTES.login)}
        />

        <ChangePasswordModal
          open={showChangePassword}
          onClose={() => { setShowChangePassword(false); setPwError(null); setPwSuccess(null); }}
          onCancel={() => { setShowChangePassword(false); setPwError(null); }}
          values={pwForm}
          onChange={(patch) => setPwForm((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleSavePassword}
          onForgotPassword={() => setShowChangePassword(false)}
          loading={pwLoading}
          error={pwError}
          success={pwSuccess}
        />

        <QuickChat userId={userId} />
      </div>
    </StarBackground>
    </UserSettingsProvider>
  );
}
