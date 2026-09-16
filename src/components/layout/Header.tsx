"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User as UserIcon, Globe, Check, Bell, CheckCheck, Dumbbell, Apple, Repeat, TrendingUp, Receipt, KeyRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LANGS, dateLocale, type Lang } from "@/lib/i18n/dictionaries";
import { api } from "@/lib/api";
import { usePermissions } from "@/components/providers/PermissionsProvider";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  user?: {
    id: string;
    role?: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  onLogout?: () => void;
}

interface NotifData {
  studentName?: string;
  workoutName?: string;
  mealName?: string;
  sessionId?: string;
  workoutId?: string;
  studentId?: string;
  dietId?: string;
  dietName?: string;
  mealId?: string;
  fromWorkoutName?: string;
}

interface AppNotification {
  id: string;
  type: string;
  read: boolean;
  data: NotifData | null;
  createdAt: string;
}

function formatRelative(iso: string, lang: Lang, t: (key: string) => string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("header.justNow");
  if (mins < 60) return `${mins}${t("header.minAgo")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t("header.hoursAgo")}`;
  return date.toLocaleDateString(dateLocale(lang), {
    day: "2-digit",
    month: "2-digit",
  });
}

export function Header({ title, onMenuToggle, user, onLogout }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const { can } = usePermissions();
  const isProfessional = user?.role === "PERSONAL" || user?.role === "NUTRITIONIST";

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<{ notifications: AppNotification[]; unreadCount: number }>(
        "/api/notifications"
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function openNotification(n: AppNotification) {
    if (!n.read) {
      try {
        await api.put(`/api/notifications/${n.id}`, { read: true });
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }
    setNotifOpen(false);
    if (n.type === "WORKOUT_COMPLETED" && n.data?.sessionId) {
      router.push(`/workouts/execute/${n.data.sessionId}`);
    } else if (n.type === "MEAL_EATEN" && n.data?.dietId) {
      router.push(`/diets/${n.data.dietId}`);
    } else if (n.type === "WORKOUT_CHANGED" && n.data?.studentId) {
      router.push(`/students/${n.data.studentId}`);
    } else if (n.type === "WORKOUT_ASSIGNED") {
      router.push("/workouts");
    } else if (n.type === "DIET_ASSIGNED") {
      router.push("/diets");
    } else if (n.type === "PROGRESS_REVIEW") {
      router.push("/progress");
    }
  }

  async function markAllRead() {
    try {
      await api.post("/api/notifications", { markAllRead: true });
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  const showBell = !!user;

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

      <div className="flex items-center gap-1.5">
        {showBell && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen) loadNotifications();
              }}
              className="relative p-2 rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
              aria-label={t("notif.title")}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl animate-slideIn overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">{t("notif.title")}</p>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      {t("notif.markAllRead")}
                    </button>
                  )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted text-sm py-8">{t("notif.empty")}</p>
                  ) : (
                    notifications.map((n) => {
                      const isWorkout = n.type === "WORKOUT_COMPLETED";
                      const isWorkoutAssigned = n.type === "WORKOUT_ASSIGNED";
                      const isDietAssigned = n.type === "DIET_ASSIGNED";
                      const isChanged = n.type === "WORKOUT_CHANGED";
                      const isProgressReview = n.type === "PROGRESS_REVIEW";
                      let titleText = t("notif.mealEaten", {
                        student: n.data?.studentName ?? "",
                        meal: n.data?.mealName ?? "",
                      });
                      if (isProgressReview) {
                        titleText = t("notif.progressReview");
                      } else if (isChanged) {
                        titleText = t("notif.workoutChanged", {
                          student: n.data?.studentName ?? "",
                          workout: n.data?.workoutName ?? "",
                          fromWorkout: n.data?.fromWorkoutName ?? "",
                        });
                      } else if (isWorkoutAssigned) {
                        titleText = n.data?.workoutName
                          ? `${t("notif.workoutAssigned")}: ${n.data.workoutName}`
                          : t("notif.workoutAssigned");
                      } else if (isDietAssigned) {
                        titleText = n.data?.dietName
                          ? `${t("notif.dietAssigned")}: ${n.data.dietName}`
                          : t("notif.dietAssigned");
                      } else if (isWorkout) {
                        titleText = t("notif.workoutCompleted", {
                          student: n.data?.studentName ?? "",
                          workout: n.data?.workoutName ?? "",
                        });
                      }
                      return (
                        <button
                          key={n.id}
                          onClick={() => openNotification(n)}
                          className={cn(
                            "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#222]",
                            n.read ? "bg-card" : "bg-accent/5"
                          )}
                        >
                          <span
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              isWorkout || isWorkoutAssigned
                                ? "bg-accent/10 text-accent"
                                : isChanged
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : isProgressReview
                                    ? "bg-purple-500/10 text-purple-400"
                                    : "bg-green-500/10 text-green-400"
                            )}
                          >
                            {isChanged ? (
                              <Repeat className="w-4 h-4" />
                            ) : isWorkout || isWorkoutAssigned ? (
                              <Dumbbell className="w-4 h-4" />
                            ) : isProgressReview ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <Apple className="w-4 h-4" />
                            )}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-white leading-snug">{titleText}</span>
                            <span className="block text-xs text-muted mt-1">{formatRelative(n.createdAt, lang, t)}</span>
                          </span>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="p-2 rounded-lg text-muted hover:text-white hover:bg-card transition-colors flex items-center gap-1.5"
            aria-label="Idioma / Language / Idioma"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase hidden sm:block">{lang}</span>
          </button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-xl shadow-2xl animate-slideIn overflow-hidden py-1">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setLangOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-muted hover:text-white hover:bg-[#222] transition-colors"
                >
                  <span>{l.label}</span>
                  {lang === l.code && <Check className="w-4 h-4 text-accent" />}
                </button>
              ))}
            </div>
          )}
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
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-[#222] transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  {t("header.profile")}
                </button>
                {isProfessional && can("billing") && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/billing");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-[#222] transition-colors"
                  >
                    <Receipt className="w-4 h-4" />
                    {t("header.billing")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/change-password");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-[#222] transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  {t("header.changePassword")}
                </button>
              </div>
              <div className="border-t border-border py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-[#222] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t("header.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </header>
  );
}