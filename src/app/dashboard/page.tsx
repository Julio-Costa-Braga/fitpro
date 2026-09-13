"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type StatsResponse, type StudentStatsResponse } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DayLetterBadge } from "@/components/ui/DayLetterBadge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { dateLocale } from "@/lib/i18n/dictionaries";
import Link from "next/link";
import {
  Users,
  Dumbbell,
  Apple,
  Plus,
  Calendar,
  TrendingUp,
  ChevronRight,
  ListChecks,
} from "lucide-react";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function TrainerDashboard({ stats }: { stats: StatsResponse }) {
  const { t, lang } = useLanguage();
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t("dash.title")}</h1>
        <p className="text-muted">{t("dash.trainerSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label={t("dash.students")} value={stats.totalStudents} />
        <StatCard icon={<Dumbbell className="w-5 h-5" />} label={t("dash.activeWorkouts")} value={stats.activeWorkouts} />
        <StatCard icon={<Apple className="w-5 h-5" />} label={t("dash.activeDiets")} value={stats.activeDiets} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/students/new"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">{t("dash.addStudent")}</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
        <Link
          href="/workouts/new"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Dumbbell className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">{t("dash.addWorkout")}</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
        <Link
          href="/diets/new"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Apple className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">{t("dash.addDiet")}</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h2 className="font-semibold">{t("dash.recentActivity")}</h2>
        </div>
        {stats.recentSessions.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted text-sm">
            {t("dash.noRecentActivity")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentSessions.map((session) => (
              <div key={session.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.workout.name}</p>
                  <p className="text-xs text-muted">
                    {session.student.name} &middot;{" "}
                    {new Date(session.date).toLocaleDateString(dateLocale(lang))}
                  </p>
                </div>
                <Badge variant={session.completed ? "success" : "warning"}>
                  {session.completed ? t("dash.concluded") : t("dash.pending")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StudentDashboard({ stats, studentId }: { stats: StudentStatsResponse; studentId?: string }) {
  const { t, tExerciseName } = useLanguage();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [otherStartingId, setOtherStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (!stats.todayWorkout?.id || !studentId) return;
    api
      .get<{ id: string; completed: boolean }[]>(
        `/api/workout-sessions?workoutId=${stats.todayWorkout.id}`
      )
      .then((sessions) => {
        const open = sessions.find((s) => !s.completed);
        setOpenSessionId(open?.id ?? null);
      })
      .catch(() => {});
  }, [stats.todayWorkout?.id, studentId]);

  async function startWorkout() {
    const workoutId = stats.todayWorkout?.id;
    if (!workoutId || !studentId) return;
    setStarting(true);
    setStartError("");
    try {
      if (openSessionId) {
        router.push(`/workouts/execute/${openSessionId}`);
        return;
      }
      const session = await api.post<{ id: string }>("/api/workout-sessions", {
        workoutId,
        studentId,
      });
      router.push(`/workouts/execute/${session.id}`);
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : t("dash.startWorkoutErr"));
      setStarting(false);
    }
  }

  async function startOtherWorkout(workoutId: string) {
    if (!workoutId || !studentId) return;
    setOtherStartingId(workoutId);
    setStartError("");
    try {
      const sessions = await api.get<{ id: string; completed: boolean }[]>(
        `/api/workout-sessions?workoutId=${workoutId}`
      );
      const open = sessions.find((s) => !s.completed);
      if (open) {
        router.push(`/workouts/execute/${open.id}`);
        return;
      }
      const session = await api.post<{ id: string }>("/api/workout-sessions", {
        workoutId,
        studentId,
      });
      router.push(`/workouts/execute/${session.id}`);
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : t("dash.startWorkoutErr"));
      setOtherStartingId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t("dash.studentTitle")}</h1>
        <p className="text-muted">{t("dash.studentSubtitle")}</p>
      </div>

      {stats.todayWorkout ? (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-lg">{t("dash.todayWorkout")}</h2>
          </div>
          <h3 className="font-medium text-white mb-3">{stats.todayWorkout.name}</h3>
          <div className="space-y-2">
            {stats.todayWorkout.exercises.map((we, i) => (
              <div key={i} className="flex items-center justify-between bg-bg rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{tExerciseName(we.exercise.name)}</p>
                  <p className="text-xs text-muted">{we.exercise.muscleGroup}</p>
                </div>
                <p className="text-xs text-muted whitespace-nowrap">
                  {we.sets}x{we.reps}
                </p>
              </div>
            ))}
          </div>
          {startError && (
            <p className="mt-3 text-xs text-red-400">{startError}</p>
          )}
          <Button
            onClick={startWorkout}
            loading={starting}
            disabled={!studentId}
            className="mt-4 w-full"
          >
            {openSessionId ? t("dash.continueWorkout") : t("dash.startWorkout")}
          </Button>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted">{t("dash.noWorkoutToday")}</p>
        </Card>
      )}

      {stats.workouts && stats.workouts.length > 1 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-lg">{t("dash.otherWorkouts")}</h2>
          </div>
          <p className="text-xs text-muted mb-4">{t("dash.otherWorkoutsHint")}</p>
          <div className="space-y-2">
            {stats.workouts
              .filter((w) => w.id !== stats.todayWorkout?.id)
              .map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between bg-bg rounded-lg px-3 py-2.5 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <DayLetterBadge letter={w.dayLetter} className="w-5 h-5 rounded-md text-[10px]" />
                      <span className="text-xs text-muted">{w.dayOfWeek || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted">{w._count.exercises} ex.</span>
                    <Button
                      size="sm"
                      onClick={() => startOtherWorkout(w.id)}
                      loading={otherStartingId === w.id}
                    >
                      {t("dash.trainOtherWorkout")}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted mb-1">{t("dash.completionRate")}</p>
          <p className="text-2xl font-bold">{stats.completionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted mb-1">{t("dash.workouts")}</p>
          <p className="text-2xl font-bold">
            {stats.completedSessions}/{stats.totalSessions}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/diets"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <Apple className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">{t("dash.viewDiet")}</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
        <Link
          href="/progress"
          className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm">{t("dash.myProgress")}</span>
          <ChevronRight className="w-4 h-4 text-muted ml-auto" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [trainerStats, setTrainerStats] = useState<StatsResponse | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStatsResponse | null>(null);
  const [studentId, setStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    if (user.role === "ADMIN") {
      router.replace("/admin");
      return;
    }

    async function loadStats() {
      try {
        if (user!.role === "PERSONAL" || user!.role === "NUTRITIONIST") {
          const data = await api.stats.get();
          setTrainerStats(data);
        } else {
          const me = await api.get<{ student: { id: string } }>(
            "/api/students/me"
          );
          setStudentId(me.student.id);
          const data = await api.stats.getStudent(me.student.id);
          setStudentStats(data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user, token, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title={t("dash.title")}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="mb-6"></div>

      {user.role === "PERSONAL" && trainerStats && (
        <TrainerDashboard stats={trainerStats} />
      )}
      {user.role === "NUTRITIONIST" && trainerStats && (
        <TrainerDashboard stats={trainerStats} />
      )}

      {user.role === "STUDENT" && studentStats && (
        <StudentDashboard stats={studentStats} studentId={studentId} />
      )}

      {user.role === "STUDENT" && !studentStats && !error && (
        <StudentDashboard
          stats={{
            totalWorkouts: 0,
            completedSessions: 0,
            totalSessions: 0,
            completionRate: 0,
            latestProgress: null,
            todayWorkout: null,
          }}
        />
      )}

      {(user.role === "PERSONAL" || user.role === "NUTRITIONIST") && !trainerStats && !error && (
        <TrainerDashboard
          stats={{
            totalStudents: 0,
            activeWorkouts: 0,
            activeDiets: 0,
            recentSessions: [],
            studentsWithRecentActivity: [],
          }}
        />
      )}
    </AppLayout>
  );
}
