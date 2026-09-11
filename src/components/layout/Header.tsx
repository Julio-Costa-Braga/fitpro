"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  user?: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  onLogout?: () => void;
}

export function Header({ title, onMenuToggle, user, onLogout }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 bg-bg/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      {user && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-card transition-colors"
          >
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <span className="text-sm font-medium hidden sm:block">{user.name}</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl animate-slideIn overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-[#222] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
