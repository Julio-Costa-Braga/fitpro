"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, Apple, TrendingUp, Library } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/workouts", label: "Treinos", icon: <Dumbbell className="w-5 h-5" /> },
  { href: "/diets", label: "Dieta", icon: <Apple className="w-5 h-5" /> },
  { href: "/progress", label: "Progresso", icon: <TrendingUp className="w-5 h-5" /> },
  { href: "/exercises", label: "Exercícios", icon: <Library className="w-5 h-5" /> },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {navItems.map((item) => {
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}