import { useSession } from "next-auth/react";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { LogOut, User as UserIcon, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClickOutside } from "@/shared/client/hooks";

interface UserMenuProps {
  isCollapsed: boolean;
  userAvatar: string | null;
  onProfile: () => void;
  onPassword: () => void;
  onSignOut: () => void;
}

export function UserMenu({ isCollapsed, userAvatar, onProfile, onPassword, onSignOut }: UserMenuProps) {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false), userMenuOpen);
  return (
    <div ref={userMenuRef} className="relative mt-auto pt-8">
      <AnimatePresence>
        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-[calc(100%-20px)] left-0 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/90 p-2 shadow-2xl backdrop-blur-md z-[200]"
          >
            <button
              onClick={() => { onProfile(); setUserMenuOpen(false); }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-ink-secondary hover:bg-primary-soft hover:text-primary transition-all cursor-pointer"
            >
              <UserIcon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{tShell("sidebar.profile")}</span>}
            </button>
            <button
              onClick={() => { onPassword(); setUserMenuOpen(false); }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-ink-secondary hover:bg-primary-soft hover:text-primary transition-all cursor-pointer"
            >
              <KeyRound className="h-4 w-4 shrink-0 text-primary" />
              {!isCollapsed && <span>{tc("auth.changePassword")}</span>}
            </button>
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{tShell("sidebar.signOut")}</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        id="tour-user-profile"
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className={`flex cursor-pointer items-center gap-3 rounded-3xl text-white shadow-lg transition-all active:scale-95 ${
          isCollapsed ? "justify-center p-3" : "p-4"
        } ${userMenuOpen ? "bg-primary-ink" : "bg-primary hover:bg-primary-hover"}`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 overflow-hidden">
          {userAvatar ? (
            <img src={userAvatar} alt={tShell("sidebar.avatarAlt")} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-5 w-5" />
          )}
        </div>
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-bold">{session?.user?.name || tc("app.defaultUserName")}</p>
            <p className="truncate text-xs opacity-70">{tc("app.defaultUserName")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
