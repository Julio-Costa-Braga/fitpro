"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, Apple, TrendingUp, Library, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type UserRole = "ADMIN" | "PERSONAL" | "STUDENT" | undefined;

interface NavItem {
  href: string;
  label: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Início", labelKey: "nav.dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/admin", label: "Admin", labelKey: "nav.admin", icon: <Shield className="w-5 h-5" />, roles: ["ADMIN"] },
  { href: "/workouts", label: "Treinos", labelKey: "nav.workouts", icon: <Dumbbell className="w-5 h-5" /> },
  { href: "/diets", label: "Dieta", labelKey: "nav.diets", icon: <Apple className="w-5 h-5" /> },
  { href: "/progress", label: "Progresso", labelKey: "nav.progress", icon: <TrendingUp className="w-5 h-5" /> },
  { href: "/exercises", label: "Exercícios", labelKey: "nav.exercises", icon: <Library className="w-5 h-5" /> },
];

export function BottomNav({ role }: { role?: UserRole }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-accent" : "text-muted hover:text-white"
              )}
            >
              <span className={cn("shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(138,43,226,0.6)]")}>
                {item.icon}
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}