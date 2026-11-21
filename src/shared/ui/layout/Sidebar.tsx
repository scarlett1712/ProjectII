import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/shared/ui/components";
import { isRouteActive } from "@/shared/config/routes";
import { sidebarLinks } from "@/shared/ui/layout/sidebarLinks";
import { UserMenu } from "@/shared/ui/layout/UserMenu";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  userAvatar: string | null;
  onProfile: () => void;
  onPassword: () => void;
  onSignOut: () => void;
}

export function Sidebar({ isCollapsed, onToggle, userAvatar, onProfile, onPassword, onSignOut }: SidebarProps) {
  const tShell = useTranslations("shell");
  const tApp = useTranslations("app");
  const pathname = usePathname();
  return (
    <aside className={`border-r border-white/20 bg-white/40 transition-all duration-300 hidden md:flex flex-col ${isCollapsed ? "w-24 p-4" : "w-64 p-8"}`}>
      <div className="flex h-full flex-col">
        {/* Logo/Brand */}
        <div className="mb-12 flex items-center justify-between px-2">
          {!isCollapsed && (
            <h2 className="text-2xl font-black tracking-tight text-primary transition-all">{tApp("name")}</h2>
          )}
          {isCollapsed && (
            <h2 className="text-2xl font-black tracking-tight text-primary transition-all">{tShell("sidebar.collapsedLogo")}</h2>
          )}
          <IconButton
            onClick={onToggle}
            label={isCollapsed ? tShell("sidebar.expandAria") : tShell("sidebar.collapseAria")}
            title={isCollapsed ? tShell("sidebar.expand") : tShell("sidebar.collapse")}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </IconButton>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-3">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isRouteActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-4 rounded-2xl py-3.5 text-sm font-bold transition-all ${
                  isCollapsed ? "justify-center px-0" : "px-4"
                } ${
                  isActive
                    ? "bg-white text-primary shadow-sm"
                    : "text-ink-muted hover:bg-white/50 hover:text-primary"
                }`}
                title={isCollapsed ? tShell(link.labelKey) : ""}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-ink-subtle group-hover:text-primary"}`} />
                {!isCollapsed && <span>{tShell(link.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>
        <UserMenu isCollapsed={isCollapsed} userAvatar={userAvatar} onProfile={onProfile} onPassword={onPassword} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}
