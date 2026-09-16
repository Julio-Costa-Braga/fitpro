"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Plus, GripVertical, Pencil, Trash2, Play, Save, X, Search, Rocket, Repeat } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ExerciseGif } from "@/components/ui/ExerciseGif";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useMuscleLabel } from "@/lib/muscle";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  gifUrl?: string | null;
}

interface WorkoutExercise {
  id: string;
  order: number;
  sets: number;
  reps: string;
  initialLoad?: string | null;
  restTime: number;
  notes?: string | null;
  alternative?: string | null;
  exercise: Exercise;
}

interface Workout {
  id: string;
  name: string;
  description?: string | null;
  dayLetter: string;
  dayOfWeek?: string | null;
  isActive: boolean;
  autoAdvance: boolean;
  deadlineDays?: number | null;
  studentId: string;
  student: { id: string; name: string };
  exercises: WorkoutExercise[];
}

const muscleGroupColors: Record<string, string> = {
  Peito: "text-red-400",
  Costas: "text-blue-400",
  Ombros: "text-yellow-400",
  Bracos: "text-green-400",
  Pernas: "text-purple-400",
  Abdomen: "text-orange-400",
  Cardio: "text-pink-400",
  Mobilidade: "text-teal-400",
  Outros: "text-muted",
};

export default function WorkoutDetailPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { t, tExerciseName } = useLanguage();
  const muscleLabel = useMuscleLabel();
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [addingExercise, setAddingExercise] = useState<string | null>(null);

  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ sets: 3, reps: "10", initialLoad: "", restTime: 60, alternative: "" });
  const [savingExercise, setSavingExercise] = useState(false);

  const [autoAdvance, setAutoAdvance] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadWorkout = useCallback(async () => {
    if (!user || !workoutId) return;
    try {
      setLoading(true);
      const data = await api.get<Workout>(`/api/workouts/${workoutId}`);
      setWorkout(data);
      setNameValue(data.name);
      setDescValue(data.description ?? "");
      setAutoAdvance(data.autoAdvance);
      setDeadlineDays(data.deadlineDays?.toString() ?? "");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, workoutId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    loadWorkout();
  }, [user, token, authLoading, router, loadWorkout]);

  async function loadExercises() {
    try {
      const data = await api.get<Exercise[]>("/api/exercises");
      setAllExercises(data);
    } catch {
      // ignore
    }
  }

  async function handleSaveName() {
    if (!nameValue.trim()) return;
    try {
      setSavingName(true);
      await api.put(`/api/workouts/${workoutId}`, {
        name: nameValue,
        description: descValue || undefined,
      });
      setEditingName(false);
      await loadWorkout();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function handleAddExercise(exerciseId: string) {
    try {
      setAddingExercise(exerciseId);
      const maxOrder = workout?.exercises.length ?? 0;
      await api.put(`/api/workouts/${workoutId}`, {
        exercises: [
          ...(workout?.exercises.map((we) => ({
            order: we.order,
            sets: we.sets,
            reps: we.reps,
            initialLoad: we.initialLoad,
            restTime: we.restTime,
            notes: we.notes,
            alternative: we.alternative,
            exerciseId: we.exercise.id,
          })) ?? []),
          {
            order: maxOrder + 1,
            sets: 3,
            reps: "10",
            initialLoad: "",
            restTime: 60,
            exerciseId,
          },
        ],
      });
      setShowAddExercise(false);
      setExerciseSearch("");
      await loadWorkout();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setAddingExercise(null);
    }
  }

  async function handleRemoveExercise(we: WorkoutExercise) {
    if (!confirm(t("wk.confirmRemoveExercise"))) return;
    try {
      const remaining = workout?.exercises
        .filter((e) => e.id !== we.id)
        .map((e, i) => ({
          order: i + 1,
          sets: e.sets,
          reps: e.reps,
          initialLoad: e.initialLoad,
          restTime: e.restTime,
          notes: e.notes,
          alternative: e.alternative,
          exerciseId: e.exercise.id,
        })) ?? [];
      await api.put(`/api/workouts/${workoutId}`, { exercises: remaining });
      await loadWorkout();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  }

  async function handleSaveExercise(we: WorkoutExercise) {
    try {
      setSavingExercise(true);
      const updated = workout?.exercises.map((e) => {
        if (e.id === we.id) {
          return {
            order: e.order,
            sets: editForm.sets,
            reps: editForm.reps,
            initialLoad: editForm.initialLoad || undefined,
            restTime: editForm.restTime,
            notes: e.notes,
            alternative: editForm.alternative.trim() || undefined,
            exerciseId: e.exercise.id,
          };
        }
        return {
          order: e.order,
          sets: e.sets,
          reps: e.reps,
          initialLoad: e.initialLoad,
          restTime: e.restTime,
          notes: e.notes,
          alternative: e.alternative,
          exerciseId: e.exercise.id,
        };
      }) ?? [];
      await api.put(`/api/workouts/${workoutId}`, { exercises: updated });
      setEditingExercise(null);
      await loadWorkout();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingExercise(false);
    }
  }

  async function handleSaveSettings() {
    try {
      setSavingSettings(true);
      await api.put(`/api/workouts/${workoutId}`, {
        autoAdvance,
        deadlineDays: autoAdvance && deadlineDays.trim()
          ? Number(deadlineDays)
          : null,
      });
      await loadWorkout();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDeleteWorkout() {
    if (!workout) return;
    if (!confirm(t("wk.confirmDeleteWorkout", { name: workout.name }))) return;
    setDeleting(true);
    try {
      await api.delete(`/api/workouts/${workout.id}`);
      router.push("/workouts");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setDeleting(false);
    }
  }

  const [starting, setStarting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [markedSkipped, setMarkedSkipped] = useState(false);

  async function handleMarkSkipped() {
    if (!workout || user?.role !== "STUDENT") return;
    if (skipping) return; // previne double-submit
    setSkipping(true);
    try {
      await api.post("/api/workout-sessions", {
        workoutId: workout.id,
        studentId: workout.studentId,
        skipped: true,
      });
      setMarkedSkipped(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setSkipping(false);
    }
  }

  async function handleStartSession() {
    if (!workout || (user?.role !== "PERSONAL" && user?.role !== "STUDENT")) return;
    if (starting) return; // previne double-submit
    setStarting(true);
    try {
      let openId: string | undefined;
      try {
        const sessions = await api.get<{ id: string; completed: boolean; skipped?: boolean }[]>(
          `/api/workout-sessions?workoutId=${workout.id}`
        );
        openId = sessions.find((s) => !s.completed && !s.skipped)?.id;
      } catch {
        openId = undefined;
      }
      if (openId) {
        router.push(`/workouts/execute/${openId}`);
        return;
      }
      const session = await api.post<{ id: string }>("/api/workout-sessions", {
        workoutId: workout.id,
        studentId: workout.studentId,
      });
      router.push(`/workouts/execute/${session.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setStarting(false);
    }
  }

  const filteredExercises = allExercises.filter((ex) => {
    if (!exerciseSearch) return true;
    const q = exerciseSearch.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      tExerciseName(ex.name).toLowerCase().includes(q) ||
      ex.muscleGroup.toLowerCase().includes(q)
    );
  });

  const existingIds = new Set(workout?.exercises.map((we) => we.exercise.id) ?? []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user || !workout) return null;

  return (
    <AppLayout title={workout.name}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3">
          <Link
            href="/workouts"
            className="p-2 rounded-lg hover:bg-card transition-colors text-muted hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="text-lg font-bold"
                  autoFocus
                />
                <Input
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  placeholder={t("wk.descEllipsis")}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleSaveName}
                  loading={savingName}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<X className="w-4 h-4" />}
                  onClick={() => {
                    setEditingName(false);
                    setNameValue(workout.name);
                    setDescValue(workout.description ?? "");
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent text-lg font-bold flex items-center justify-center">
                  {workout.dayLetter}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{workout.name}</h1>
                    {user.role === "PERSONAL" && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="p-1 rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted">
                    {workout.student.name}
                    {workout.dayOfWeek && ` \u00B7 ${workout.dayOfWeek}`}
                    {workout.description && ` \u00B7 ${workout.description}`}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {(user.role === "PERSONAL" || user.role === "STUDENT") && (
              <Button
                icon={<Play className="w-4 h-4" />}
                onClick={handleStartSession}
                disabled={workout.exercises.length === 0 || markedSkipped}
              >
                {t("wk.startWorkout")}
              </Button>
            )}
            {user.role === "STUDENT" && (
              markedSkipped ? (
                <Badge variant="warning">{t("wk.skippedToday")}</Badge>
              ) : (
                <Button
                  variant="secondary"
                  icon={<X className="w-4 h-4" />}
                  onClick={handleMarkSkipped}
                  loading={skipping}
                >
                  {t("wk.markSkipped")}
                </Button>
              )
            )}
            {user.role === "PERSONAL" && (
              <Button
                variant="secondary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  loadExercises();
                  setShowAddExercise(true);
                }}
              >
                {t("common.add")}
              </Button>
            )}
            {(user.role === "PERSONAL" || user.role === "ADMIN") && (
              <Button
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleDeleteWorkout}
                loading={deleting}
              >
                {t("common.delete")}
              </Button>
            )}
          </div>
        </div>

        {user.role === "PERSONAL" && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="w-4 h-4 text-accent" />
              <h2 className="font-semibold text-sm">{t("wk.automation")}</h2>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex items-center justify-between gap-4 flex-1">
                <div>
                  <p className="text-sm font-medium">{t("wk.autoAdvance")}</p>
                  <p className="text-xs text-muted">
                    {t("wk.autoAdvanceHint")}
                  </p>
                </div>
                <button
                  onClick={() => setAutoAdvance(!autoAdvance)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    autoAdvance ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      autoAdvance ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
              <div className="w-full sm:w-56">
                <label className="block text-xs font-medium text-muted mb-1">{t("wk.deadline")}</label>
                <input
                  type="number"
                  min={1}
                  disabled={!autoAdvance}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  placeholder={autoAdvance ? t("wk.deadlinePlaceholder") : t("wk.autoAdvancePlaceholder")}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-40"
                />
              </div>
              <Button size="sm" icon={<Save className="w-4 h-4" />} onClick={handleSaveSettings} loading={savingSettings}>
                {t("common.save")}
              </Button>
            </div>
            {autoAdvance && Number(deadlineDays) > 0 && (
              <p className="text-xs text-muted mt-3">
                {t("wk.deadlineHint", { n: deadlineDays, s: Number(deadlineDays) > 1 ? "s" : "" })}
              </p>
            )}
          </Card>
        )}

        {workout.exercises.length === 0 ? (
          <Card className="p-12 text-center">
            <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted mb-3">{t("wk.noExercises")}</p>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                loadExercises();
                setShowAddExercise(true);
              }}
            >
              {t("wk.addExercise")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {workout.exercises.map((we, idx) => (
              <Card key={we.id}>
                <CardContent className="flex items-center gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {we.exercise.gifUrl ? (
                      <ExerciseGif
                        src={we.exercise.gifUrl}
                        alt={we.exercise.name}
                        title={tExerciseName(we.exercise.name)}
                        className="w-12 h-12 rounded-lg bg-bg"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-bg flex items-center justify-center shrink-0">
                        <Dumbbell className="w-5 h-5 text-muted" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{tExerciseName(we.exercise.name)}</h3>
                      <span className={`text-xs ${muscleGroupColors[we.exercise.muscleGroup] ?? "text-muted"}`}>
                        {muscleLabel(we.exercise.muscleGroup)}
                      </span>
                    </div>
                    {editingExercise === we.id ? (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">{t("wk.sAbbr")}</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.sets}
                            onChange={(e) => setEditForm({ ...editForm, sets: +e.target.value })}
                            className="w-14 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">{t("wk.rAbbr")}</label>
                          <input
                            value={editForm.reps}
                            onChange={(e) => setEditForm({ ...editForm, reps: e.target.value })}
                            className="w-16 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">{t("wk.loadLabel")}</label>
                          <input
                            value={editForm.initialLoad}
                            onChange={(e) => setEditForm({ ...editForm, initialLoad: e.target.value })}
                            className="w-20 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">{t("wk.descAbbr")}</label>
                          <input
                            type="number"
                            min={0}
                            value={editForm.restTime}
                            onChange={(e) => setEditForm({ ...editForm, restTime: +e.target.value })}
                            className="w-16 bg-bg border border-border rounded px-2 py-1 text-xs text-white text-center"
                          />
                        </div>
                        <div className="w-full flex-1 min-w-[220px]">
                          <label className="block text-xs text-muted mb-1">
                            {t("wk.alternativeLabel")}
                          </label>
                          <input
                            value={editForm.alternative}
                            onChange={(e) => setEditForm({ ...editForm, alternative: e.target.value })}
                            placeholder={t("wk.alternativePlaceholder")}
                            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/40"
                          />
                        </div>
                        <Button
                          size="sm"
                          icon={<Save className="w-3 h-3" />}
                          onClick={() => handleSaveExercise(we)}
                          loading={savingExercise}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<X className="w-3 h-3" />}
                          onClick={() => setEditingExercise(null)}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted mt-0.5">
                        {we.sets}x{we.reps}
                        {we.initialLoad && ` \u00B7 ${we.initialLoad}`}
                        {` \u00B7 ${t("wk.restTime", { s: we.restTime })}`}
                      </p>
                    )}
                    {we.alternative && (
                      <p className="text-xs text-accent/90 mt-1 flex items-start gap-1">
                        <Repeat className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{t("wk.noMachineHint", { name: we.alternative })}</span>
                      </p>
                    )}
                  </div>

                  {user.role === "PERSONAL" && editingExercise !== we.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingExercise(we.id);
                          setEditForm({
                            sets: we.sets,
                            reps: we.reps,
                            initialLoad: we.initialLoad ?? "",
                            restTime: we.restTime,
                            alternative: we.alternative ?? "",
                          });
                        }}
                        className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveExercise(we)}
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showAddExercise}
        onClose={() => {
          setShowAddExercise(false);
          setExerciseSearch("");
        }}
        title={t("wk.addExercise")}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            placeholder={t("wk.modalSearch")}
            icon={<Search className="w-4 h-4" />}
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
          />
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {filteredExercises.length === 0 ? (
              <p className="text-center text-muted text-sm py-6">{t("wk.modalNoResults")}</p>
            ) : (
              filteredExercises.map((ex) => {
                const alreadyAdded = existingIds.has(ex.id);
                return (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg hover:bg-[#222] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tExerciseName(ex.name)}</p>
                        <p className={`text-xs ${muscleGroupColors[ex.muscleGroup] ?? "text-muted"}`}>
                          {muscleLabel(ex.muscleGroup)}
                        </p>
                      </div>
                    </div>
                    {alreadyAdded ? (
                      <Badge variant="default">{t("wk.alreadyAdded")}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => handleAddExercise(ex.id)}
                        loading={addingExercise === ex.id}
                      >
                        {t("common.add")}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function Dumbbell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" /><path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" />
    </svg>
  );
}
