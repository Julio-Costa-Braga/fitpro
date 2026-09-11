"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/components/providers/AuthProvider";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title = "Dashboard" }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} role={user?.role} />

      <div className="lg:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Header
          title={title}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>
      </div>

      <BottomNav role={user?.role} />
    </div>
  );
}
