import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isRouteActive } from "@/shared/config/routes";
import { sidebarLinks } from "@/shared/ui/layout/sidebarLinks";

export function MobileBottomNav() {
  const tShell = useTranslations("shell");
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-purple-100/80 flex items-center justify-around pt-2 pb-[max(env(safe-area-inset-bottom),0.85rem)] px-1 shadow-bar-top duration-200">
      {sidebarLinks.map((link) => {
        const Icon = link.icon;
        const isActive = isRouteActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-95 ${
              isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isActive ? "bg-purple-100 text-primary" : ""}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className={`text-2xs font-bold mt-0.5 ${isActive ? "text-primary" : "text-gray-500"}`}>
              {tShell(link.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
