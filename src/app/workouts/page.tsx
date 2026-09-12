"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Dumbbell, Plus, Filter, Search, Activity, Layers, CalendarDays, CalendarRange, List, ChevronLeft, ChevronRight, Bed, Moon, CalendarOff } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DayLetterBadge, dayLetterColor, WEEKDAY_ORDER, normalizeDay } from "@/components/ui/DayLetterBadge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { dayOfWeekKeys } from "@/lib/i18n/dictionaries";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  email?: string | null;
  user?: { id: string; isActive: boolean } | null;
  restDays?: { weekday: string }[] | null;
}

interface WorkoutExercise {
  id: string;
  order: number;
  sets: number;
  reps: string;
  initialLoad?: string | null;
  restTime: number;
  exercise: {
    id: string;
    name: string;
    muscleGroup: string;
  };
}

interface Workout {
  id: string;
  name: string;
  description?: string | null;
  dayLetter: string;
  dayOfWeek?: string | null;
  isActive: boolean;
  createdAt: string;
  studentId: string;
  student?: Student;
  exercises: WorkoutExercise[];
  sessions?: {
    id: string;
    date: string;
    _count: { completedExercises: number };
    completedExercises: { id: string }[];
  }[];
}

const DAY_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function WorkoutsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [view, setView] = useState<"week" | "month" | "list">("week");
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    studentId: "",
    dayLetter: "A",
    dayOfWeek: "",
  });

  const loadWorkouts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      if (user.role === "PERSONAL") {
        const [studentsData, ws] = await Promise.all([
          api.get<{ students: Student[] }>("/api/students"),
          api.get<Workout[]>("/api/workouts"),
        ]);
        setStudents(studentsData.students);
        setWorkouts(ws);
      } else {
        const studentsData = await api.get<{ students: Student[] }>(`/api/students?studentId=${user.id}`);
        setStudents(studentsData?.students ?? []);
        if (studentsData?.students?.length) {
          const ws = await api.get<Workout[]>(`/api/workouts?studentId=${studentsData.students[0].id}`);
          setWorkouts(ws);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    loadWorkouts();
  }, [user, token, authLoading, router, loadWorkouts]);

  const filteredWorkouts = workouts.filter((w) => {
    if (filterStudent !== "all" && w.studentId !== filterStudent) return false;
    if (filterDay !== "all" && w.dayLetter !== filterDay) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.student?.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const groupedByDay = DAY_LETTERS.reduce(
    (acc, letter) => {
      acc[letter] = filteredWorkouts.filter((w) => w.dayLetter === letter);
      return acc;
    },
    {} as Record<string, Workout[]>
  );

  const weekLabel = (canonical: string): string => {
    const opt = dayOfWeekKeys.find((o) => o.value === canonical);
    return opt ? t(opt.key) : canonical;
  };

  const byDay = WEEKDAY_ORDER.map((day) => ({
    day,
    items: filteredWorkouts.filter((w) => normalizeDay(w.dayOfWeek) === day),
  }));
  const byDayMap = Object.fromEntries(byDay.map((g) => [g.day, g.items]));
  const noDayItems = filteredWorkouts.filter((w) => !normalizeDay(w.dayOfWeek));
  const showStudent = user?.role === "PERSONAL" && filterStudent === "all";

  const activeStudentId =
    user?.role === "PERSONAL"
      ? filterStudent !== "all"
        ? filterStudent
        : null
      : students[0]?.id ?? null;
  const activeStudent = students.find((s) => s.id === activeStudentId);
  const restSet = new Set((activeStudent?.restDays ?? []).map((r) => r.weekday));
  const canEditRest = user?.role === "PERSONAL" && activeStudentId != null;

  async function toggleRestDay(weekday: string) {
    if (!canEditRest || !activeStudentId) return;
    const active = !restSet.has(weekday);
    try {
      const data = await api.put<{ restDays: string[] }>(
        `/api/students/${activeStudentId}/rest-days`,
        { weekday, active }
      );
      const restArray = data.restDays.map((w) => ({ weekday: w }));
      setStudents((prev) =>
        prev.map((s) =>
          s.id === activeStudentId ? { ...s, restDays: restArray } : s
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  }

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((startIndex + daysInMonth) / 7) * 7;
  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const monthRaw = new Date(year, month, 1).toLocaleDateString(
    lang === "pt" ? "pt-BR" : lang,
    { month: "long", year: "numeric" }
  );
  const monthTitle = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const shiftMonth = (delta: number) =>
    setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name || !createForm.studentId) return;
    try {
      setCreating(true);
      const workout = await api.post<Workout>("/api/workouts", {
        name: createForm.name,
        description: createForm.description || undefined,
        studentId: createForm.studentId,
        dayLetter: createForm.dayLetter,
        dayOfWeek: createForm.dayOfWeek || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ name: "", description: "", studentId: "", dayLetter: "A", dayOfWeek: "" });
      router.push(`/workouts/${workout.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title={t("wk.title")}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{t("wk.title")}</h1>
            <p className="text-muted text-sm">{t("wk.subtitle")}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/workouts/templates">
              <Button variant="secondary" icon={<Layers className="w-4 h-4" />}>
                Modelos
              </Button>
            </Link>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              {t("wk.newWorkout")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              {
                id: "week",
                label: t("wk.viewWeek"),
                icon: <CalendarRange className="w-4 h-4" />,
              },
              {
                id: "month",
                label: t("wk.viewMonth"),
                icon: <CalendarDays className="w-4 h-4" />,
              },
              {
                id: "list",
                label: t("wk.viewList"),
                icon: <List className="w-4 h-4" />,
              },
            ]}
            activeTab={view}
            onChange={(id) => setView(id as "week" | "month" | "list")}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t("wk.searchPlaceholder")}
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          {user.role === "PERSONAL" && students.length > 0 && (
            <select
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="all">{t("common.allStudents")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {view === "list" && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted" />
              {DAY_LETTERS.map((letter) => (
                <button
                  key={letter}
                  onClick={() => setFilterDay(filterDay === letter ? "all" : letter)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    filterDay === letter
                      ? dayLetterColor[letter]
                      : "bg-card border border-border text-muted hover:text-white"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredWorkouts.length === 0 ? (
          <Card className="p-12 text-center">
            <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted mb-1">{t("wk.noWorkouts")}</p>
            <p className="text-xs text-muted/60">
              {t("wk.noWorkoutsHint")}
            </p>
          </Card>
        ) : view === "week" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              {byDay.map(({ day, items }) => (
                <div key={day} className="flex flex-col gap-2 min-h-[140px]">
                  <div className="flex items-center justify-between px-1 gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted truncate">
                        {weekLabel(day)}
                      </span>
                      {restSet.has(day) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted bg-card border border-border/60 px-1.5 py-0.5 rounded-full shrink-0">
                          <Bed className="w-3 h-3" />
                          {t("wk.rest")}
                        </span>
                      )}
                      {canEditRest && (
                        <button
                          type="button"
                          onClick={() => toggleRestDay(day)}
                          title={restSet.has(day) ? "Remover descanso" : "Marcar como descanso"}
                          className={`w-5 h-5 rounded-md inline-flex items-center justify-center shrink-0 transition-colors ${
                            restSet.has(day)
                              ? "bg-accent/15 text-accent hover:bg-accent/25"
                              : "text-muted hover:text-white hover:bg-card"
                          }`}
                        >
                          {restSet.has(day) ? (
                            <CalendarOff className="w-3 h-3" />
                          ) : (
                            <Moon className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    {items.length > 0 && <Badge variant="default">{items.length}</Badge>}
                  </div>
                  {items.length === 0 ? (
                    <div className="flex-1 rounded-lg border border-dashed border-border/60 text-xs text-muted/40 flex items-center justify-center py-6">
                      —
                    </div>
                  ) : (
                    items.map((w) => (
                      <MiniWorkoutCard key={w.id} w={w} showStudent={showStudent} />
                    ))
                  )}
                </div>
              ))}
            </div>
            {noDayItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                    {t("wk.noDay")}
                  </h2>
                  <Badge variant="default">{noDayItems.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {noDayItems.map((workout) => (
                    <WorkoutCard key={workout.id} workout={workout} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : view === "month" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="font-semibold capitalize">{monthTitle}</h2>
              <Button variant="secondary" size="sm" onClick={() => shiftMonth(0)}>
                {t("wk.today")}
              </Button>
            </div>
            <Card className="overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border">
                {WEEKDAY_ORDER.map((d) => (
                  <div
                    key={d}
                    className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted"
                  >
                    {weekLabel(d).slice(0, 3)}
                  </div>
                ))}
              </div>
              {Array.from({ length: totalCells / 7 }).map((_, row) => (
                <div
                  key={row}
                  className="grid grid-cols-7 divide-x divide-border border-b border-border last:border-b-0"
                >
                  {Array.from({ length: 7 }).map((_, col) => {
                    const dayNum = row * 7 + col - startIndex + 1;
                    if (dayNum < 1 || dayNum > daysInMonth) {
                      return <div key={col} className="min-h-[72px] bg-bg/40" />;
                    }
                    const dow = new Date(year, month, dayNum).getDay();
                    const canon = WEEKDAY_ORDER[(dow + 6) % 7];
                    const dayWorkouts = byDayMap[canon] ?? [];
                    const isRest = restSet.has(canon);
                    return (
                      <div key={col} className="min-h-[72px] p-1.5">
                        <span
                          className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-[11px] ${
                            isToday(dayNum)
                              ? "bg-accent text-white font-bold"
                              : "text-muted"
                          }`}
                        >
                          {dayNum}
                        </span>
                        {isRest && (
                          <p className="mt-0.5 text-[9px] font-medium text-muted/70 flex items-center gap-1">
                            <Bed className="w-2.5 h-2.5" />
                            {t("wk.rest")}
                          </p>
                        )}
                        <div className="mt-1 space-y-1">
                          {dayWorkouts.slice(0, 2).map((w) => (
                            <Link
                              key={w.id}
                              href={`/workouts/${w.id}`}
                              className="block rounded-md px-1.5 py-1 bg-bg hover:bg-accent/10 transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <DayLetterBadge
                                  letter={w.dayLetter}
                                  className="w-5 h-5 rounded text-[9px]"
                                />
                                <span className="text-[10px] font-medium text-white truncate">
                                  {w.name}
                                </span>
                              </div>
                              {showStudent && w.student && (
                                <p className="text-[9px] text-muted truncate">
                                  {w.student.name}
                                </p>
                              )}
                            </Link>
                          ))}
                          {dayWorkouts.length > 2 && (
                            <p className="text-[9px] text-muted px-1">
                              +{dayWorkouts.length - 2}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </Card>
          </div>
        ) : filterDay !== "all" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        ) : (
          DAY_LETTERS.map(
            (letter) =>
              groupedByDay[letter].length > 0 && (
                <div key={letter} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DayLetterBadge
                      letter={letter}
                      className="w-8 h-8 text-sm"
                    />
                    <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                      {t("common.day")} {letter}
                    </h2>
                    <Badge variant="default">{groupedByDay[letter].length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedByDay[letter].map((workout) => (
                      <WorkoutCard key={workout.id} workout={workout} />
                    ))}
                  </div>
                </div>
              )
          )
        )}
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t("wk.newWorkout")}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label={t("wk.workoutName")}
            placeholder={t("wk.namePlaceholder")}
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
          />
          <Input
            label={t("wk.description")}
            placeholder={t("wk.descPlaceholder")}
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
          />
          {user.role === "PERSONAL" && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted">{t("wk.student")}</label>
              <select
                value={createForm.studentId}
                onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                required
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
              >
                <option value="">{t("common.selectStudent")}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("wk.dayLetter")}</label>
            <div className="flex gap-2">
              {DAY_LETTERS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, dayLetter: letter })}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                    createForm.dayLetter === letter
                      ? dayLetterColor[letter]
                      : "bg-card border border-border text-muted hover:text-white"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("wk.dayOfWeek")}</label>
            <select
              value={createForm.dayOfWeek}
              onChange={(e) => setCreateForm({ ...createForm, dayOfWeek: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
            >
              {dayOfWeekKeys.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.key)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={creating} className="flex-1">
              {t("wk.newWorkout")}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const { t } = useLanguage();
  const openSession = workout.sessions?.[0];
  const totalSets = openSession?._count.completedExercises ?? 0;
  const doneSets = openSession?.completedExercises.length ?? 0;
  const progressPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  return (
    <Link href={`/workouts/${workout.id}`}>
      <Card hover className="h-full">
        <CardContent className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <DayLetterBadge letter={workout.dayLetter} className="w-8 h-8 text-sm" />
              <div>
                <h3 className="font-semibold text-sm leading-tight">{workout.name}</h3>
                {workout.dayOfWeek && (
                  <p className="text-xs text-muted">{workout.dayOfWeek}</p>
                )}
              </div>
            </div>
            <Badge variant={workout.isActive ? "success" : "default"}>
              {workout.isActive ? t("common.active") : t("common.inactive")}
            </Badge>
          </div>
          {openSession && totalSets > 0 && (
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  {t("wk.inProgress")}
                </span>
                <span className="text-xs font-semibold text-accent">
                  {doneSets}/{totalSets} &middot; {progressPct}%
                </span>
              </div>
              <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
            <span className="text-xs text-muted">
              {workout.student?.name ?? t("auth.student")}
            </span>
            <span className="text-xs text-muted">
              {t("common.exercisesCount", {
                count: workout.exercises.length,
                plural: workout.exercises.length !== 1 ? "s" : "",
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniWorkoutCard({ w, showStudent }: { w: Workout; showStudent: boolean }) {
  const { t } = useLanguage();
  return (
    <Link href={`/workouts/${w.id}`}>
      <Card hover className="p-2.5">
        <div className="flex items-center gap-2">
          <DayLetterBadge letter={w.dayLetter} className="w-7 h-7 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{w.name}</p>
            <p className="text-[10px] text-muted">
              {t("common.exercisesCount", {
                count: w.exercises.length,
                plural: w.exercises.length !== 1 ? "s" : "",
              })}
            </p>
          </div>
        </div>
        {showStudent && w.student && (
          <p className="text-[10px] text-muted truncate mt-1">{w.student.name}</p>
        )}
      </Card>
    </Link>
  );
}
