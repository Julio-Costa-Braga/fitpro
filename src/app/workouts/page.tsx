"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Dumbbell, Plus, Filter, Search } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
}

const DAY_LETTERS = ["A", "B", "C", "D", "E", "F"];

const dayLetterColor: Record<string, string> = {
  A: "bg-accent/15 text-accent",
  B: "bg-blue-500/15 text-blue-400",
  C: "bg-green-500/15 text-green-400",
  D: "bg-yellow-500/15 text-yellow-400",
  E: "bg-red-500/15 text-red-400",
  F: "bg-pink-500/15 text-pink-400",
};

export default function WorkoutsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterStudent, setFilterStudent] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        const studentsData = await api.get<{ students: Student[] }>("/api/students");
        setStudents(studentsData.students);

        const allWorkouts: Workout[] = [];
        for (const student of studentsData.students) {
          try {
            const ws = await api.get<Workout[]>(`/api/workouts?studentId=${student.id}`);
            allWorkouts.push(
              ...ws.map((w) => ({ ...w, student: { id: student.id, name: student.name, email: student.email } }))
            );
          } catch {
            // skip
          }
        }
        setWorkouts(allWorkouts);
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
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            {t("wk.newWorkout")}
          </Button>
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
        </div>

        {filteredWorkouts.length === 0 ? (
          <Card className="p-12 text-center">
            <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted mb-1">{t("wk.noWorkouts")}</p>
            <p className="text-xs text-muted/60">
              {t("wk.noWorkoutsHint")}
            </p>
          </Card>
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
                    <span
                      className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center ${dayLetterColor[letter]}`}
                    >
                      {letter}
                    </span>
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
  const colorClass = dayLetterColor[workout.dayLetter] || dayLetterColor.A;
  const { t } = useLanguage();
  return (
    <Link href={`/workouts/${workout.id}`}>
      <Card hover className="h-full">
        <CardContent className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center ${colorClass}`}>
                {workout.dayLetter}
              </span>
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
