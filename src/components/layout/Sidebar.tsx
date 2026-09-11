"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Apple,
  TrendingUp,
  Library,
  Shield,
  X,
  ChevronLeft,
  DumbbellIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = "ADMIN" | "PERSONAL" | "STUDENT" | undefined;

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const allNavItems: { items: NavItem[]; roles?: UserRole[] }[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> }] },
  {
    items: [{ href: "/admin", label: "Administracao", icon: <Shield className="w-5 h-5" /> }],
    roles: ["ADMIN"],
  },
  {
    items: [{ href: "/students", label: "Alunos", icon: <Users className="w-5 h-5" /> }],
    roles: ["ADMIN", "PERSONAL"],
  },
  {
    items: [
      { href: "/workouts", label: "Treinos", icon: <Dumbbell className="w-5 h-5" /> },
      { href: "/diets", label: "Dieta", icon: <Apple className="w-5 h-5" /> },
      { href: "/progress", label: "Progresso", icon: <TrendingUp className="w-5 h-5" /> },
      { href: "/exercises", label: "Exercicios", icon: <Library className="w-5 h-5" /> },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  role?: UserRole;
}

export function Sidebar({ open, onClose, role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = allNavItems
    .flatMap((section) => section.items)
    .filter((item) => {
      const section = allNavItems.find((s) => s.items.includes(item));
      return !section?.roles || (role && section.roles.includes(role));
    });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-card border-r border-border z-50 flex flex-col transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <DumbbellIcon className="w-5 h-5 text-accent" />
              <span className="font-bold text-lg tracking-tight">FitPro</span>
            </Link>
          )}
          {collapsed && (
            <DumbbellIcon className="w-5 h-5 text-accent mx-auto" />
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-muted hover:text-white hover:bg-[#222] transition-colors"
            >
              <ChevronLeft
                className={cn(
                  "w-4 h-4 transition-transform",
                  collapsed && "rotate-180"
                )}
              />
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-muted hover:text-white hover:bg-[#222] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-white hover:bg-[#222]"
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={cn("shrink-0", isActive && "text-accent")}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-muted/50 text-center">FitPro v0.2</p>
          </div>
        )}
      </aside>
    </>
  );
}
