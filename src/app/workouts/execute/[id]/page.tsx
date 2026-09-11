"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Check, ArrowRight, ArrowLeft, Timer, Dumbbell, Trophy, Maximize2, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface CompletedExercise {
  id: string;
  setNumber: number;
  reps: number;
  load?: string | null;
  completed: boolean;
  exerciseId: string;
  exercise: {
    id: string;
    name: string;
    muscleGroup: string;
    gifUrl?: string | null;
  };
}

interface Session {
  id: string;
  date: string;
  completed: boolean;
  workout: {
    id: string;
    name: string;
    dayLetter: string;
    exercises?: { exerciseId: string; restTime: number }[];
  };
  student: { id: string; name: string };
  completedExercises: CompletedExercise[];
}

interface ExerciseGroup {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  gifUrl?: string | null;
  sets: CompletedExercise[];
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function RestCircle({ seconds, total }: { seconds: number; total: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const ratio = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 1;
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          className="text-accent transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] uppercase tracking-wider text-muted">{formatTimer(total)}</span>
        <span className="font-mono text-4xl font-bold">{formatTimer(seconds)}</span>
      </div>
    </div>
  );
}

export default function WorkoutExecutePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { t, tExerciseName } = useLanguage();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restConfig, setRestConfig] = useState(60);
  const [fullscreenGif, setFullscreenGif] = useState<string | null>(null);
  const [completingAll, setCompletingAll] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restRef = useRef<NodeJS.Timeout | null>(null);

  const loadSession = useCallback(async () => {
    if (!user || !sessionId) return;
    try {
      const data = await api.get<Session>(`/api/workout-sessions/${sessionId}`);
      setSession(data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, sessionId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.replace("/");
      return;
    }
    loadSession();
  }, [user, token, authLoading, router, loadSession]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTotalDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (restTimer === null) {
      if (restRef.current) clearInterval(restRef.current);
      return;
    }
    if (restTimer <= 0) {
      setRestTimer(null);
      return;
    }
    restRef.current = setInterval(() => {
      setRestTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => {
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [restTimer]);

  useEffect(() => {
    if (!fullscreenGif) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenGif(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenGif]);

  useEffect(() => {
    if (!session) return;
    const handler = setTimeout(() => {
      api
        .put(`/api/workout-sessions/${sessionId}`, {
          completedExercises: session.completedExercises.map((ce) => ({
            id: ce.id,
            reps: ce.reps,
            load: ce.load ?? null,
            completed: ce.completed,
          })),
        })
        .catch(() => {});
    }, 700);
    return () => clearTimeout(handler);
  }, [session, sessionId]);

  const exerciseGroups: ExerciseGroup[] = [];
  if (session) {
    const map = new Map<string, ExerciseGroup>();
    for (const ce of session.completedExercises) {
      if (!map.has(ce.exerciseId)) {
        map.set(ce.exerciseId, {
          exerciseId: ce.exerciseId,
          exerciseName: ce.exercise.name,
          muscleGroup: ce.exercise.muscleGroup,
          gifUrl: ce.exercise.gifUrl,
          sets: [],
        });
      }
      map.get(ce.exerciseId)!.sets.push(ce);
    }
    exerciseGroups.push(...map.values());
  }

  const currentGroup = exerciseGroups[currentExerciseIdx];
  const completedExercises = exerciseGroups.filter((g) =>
    g.sets.every((s) => s.completed)
  );
  const totalExercises = exerciseGroups.length;
  const isLastExercise = currentExerciseIdx === totalExercises - 1;
  const allCompleted = totalExercises > 0 && completedExercises.length === totalExercises;

  const restByExercise = useMemo(() => {
    const map: Record<string, number> = {};
    for (const we of session?.workout.exercises ?? []) {
      map[we.exerciseId] = we.restTime ?? 60;
    }
    return map;
  }, [session?.workout.exercises]);

  useEffect(() => {
    if (currentGroup) {
      setRestConfig(restByExercise[currentGroup.exerciseId] ?? 60);
    }
  }, [currentGroup?.exerciseId, restByExercise]);

  function toggleSet(completedSet: CompletedExercise) {
    if (!session) return;
    const wasCompleted = completedSet.completed;
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        completedExercises: prev.completedExercises.map((ce) =>
          ce.id === completedSet.id ? { ...ce, completed: !ce.completed } : ce
        ),
      };
    });
    if (!wasCompleted) {
      setRestTimer(restConfig);
    }
  }

  async function updateSetLoad(completedSet: CompletedExercise, load: string) {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        completedExercises: prev.completedExercises.map((ce) =>
          ce.id === completedSet.id ? { ...ce, load } : ce
        ),
      };
    });
  }

  async function updateSetReps(completedSet: CompletedExercise, reps: number) {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        completedExercises: prev.completedExercises.map((ce) =>
          ce.id === completedSet.id ? { ...ce, reps } : ce
        ),
      };
    });
  }

  async function handleFinish() {
    if (!session) return;
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await api.put(`/api/workout-sessions/${sessionId}`, {
        completed: true,
        completedExercises: session.completedExercises.map((ce) => ({
          id: ce.id,
          reps: ce.reps,
          load: ce.load,
          completed: ce.completed,
        })),
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  }

  async function handleCompleteAll() {
    if (!session) return;
    if (!window.confirm(t("ex.completeAllConfirm"))) return;
    setCompletingAll(true);
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await api.put(`/api/workout-sessions/${sessionId}`, {
        completed: true,
        completedExercises: session.completedExercises.map((ce) => ({
          id: ce.id,
          reps: ce.reps,
          load: ce.load ?? null,
          completed: true,
        })),
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setCompletingAll(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user || !session || !currentGroup) return null;

  const currentSetsDone = currentGroup.sets.filter((s) => s.completed).length;
  const currentSetsTotal = currentGroup.sets.length;

  return (
    <AppLayout title={t("ex.title", { name: session.workout.name })}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">{session.student.name}</p>
            <p className="text-lg font-bold">
              {session.workout.name}
              <span className="ml-2 text-accent text-sm">{t("common.day")} {session.workout.dayLetter}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted text-sm">
            <Timer className="w-4 h-4" />
            <span className="font-mono">{formatTimer(totalDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${totalExercises > 0 ? (completedExercises.length / totalExercises) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-muted whitespace-nowrap">
            {completedExercises.length}/{totalExercises}
          </span>
        </div>

        {restTimer !== null && restTimer > 0 && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex flex-col items-center py-6">
              <p className="text-sm text-muted mb-3">{t("ex.rest")}</p>
              <RestCircle seconds={restTimer} total={restConfig} />
              <button
                onClick={() => setRestTimer(null)}
                className="mt-4 text-xs text-muted hover:text-white transition-colors"
              >
                {t("ex.skipRest")}
              </button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-4">
              {currentGroup.gifUrl ? (
                <button
                  type="button"
                  onClick={() => setFullscreenGif(currentGroup.gifUrl!)}
                  className="w-24 h-24 rounded-xl bg-bg overflow-hidden shrink-0 group relative"
                >
                  <img
                    src={currentGroup.gifUrl}
                    alt={currentGroup.exerciseName}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </span>
                </button>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-bg flex items-center justify-center shrink-0">
                  <Dumbbell className="w-8 h-8 text-muted/30" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{tExerciseName(currentGroup.exerciseName)}</h2>
                <p className="text-sm text-muted">{currentGroup.muscleGroup}</p>
                <p className="text-xs text-muted mt-1">
                  {t("ex.setOf", { current: currentExerciseIdx + 1, total: totalExercises })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {currentGroup.sets.map((set, i) => (
                <div
                  key={set.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    set.completed
                      ? "bg-accent/10 border border-accent/20"
                      : "bg-bg border border-border"
                  }`}
                >
                  <button
                    onClick={() => toggleSet(set)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      set.completed
                        ? "bg-accent text-white"
                        : "border-2 border-border text-muted hover:border-accent/50 hover:text-accent"
                    }`}
                  >
                    {set.completed && <Check className="w-4 h-4" />}
                    {!set.completed && <span className="text-xs font-bold">{i + 1}</span>}
                  </button>

                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">{t("ex.reps")}</span>
                      <input
                        type="number"
                        min={0}
                        value={set.reps}
                        onChange={(e) => updateSetReps(set, +e.target.value)}
                        className="w-14 bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-accent/40"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">{t("ex.load")}</span>
                      <input
                        value={set.load ?? ""}
                        onChange={(e) => updateSetLoad(set, e.target.value)}
                        placeholder="kg"
                        className="w-20 bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-accent/40 placeholder:text-muted/40"
                      />
                    </div>
                  </div>

                  {set.completed ? (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-green-400">
                      <Check className="w-4 h-4" />
                      {t("ex.completed")}
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => toggleSet(set)}
                      className="shrink-0 whitespace-nowrap"
                    >
                      {t("ex.complete")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          variant="secondary"
          className="w-full"
          icon={<CheckCircle2 className="w-4 h-4" />}
          onClick={handleCompleteAll}
          loading={completingAll}
        >
          {t("ex.completeAll")}
        </Button>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="secondary"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => setCurrentExerciseIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentExerciseIdx === 0}
          >
            {t("ex.back")}
          </Button>

          {isLastExercise && allCompleted ? (
            <Button
              icon={<Trophy className="w-4 h-4" />}
              onClick={handleFinish}
              className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
            >
              {t("ex.finishWorkout")}
            </Button>
          ) : (
            <Button
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() =>
                setCurrentExerciseIdx((prev) => Math.min(totalExercises - 1, prev + 1))
              }
              disabled={isLastExercise}
            >
              {t("ex.next")}
            </Button>
          )}
        </div>

        {!allCompleted && isLastExercise && (
          <div className="text-center">
            <Button
              variant="danger"
              onClick={handleFinish}
            >
              {t("ex.finishPending")}
            </Button>
          </div>
        )}
      </div>

      {fullscreenGif && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setFullscreenGif(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenGif(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-white font-semibold text-center px-6 mb-4 max-w-md">
            {tExerciseName(currentGroup.exerciseName)}
          </p>
          <img
            src={fullscreenGif}
            alt={currentGroup.exerciseName}
            className="max-w-full max-h-[80vh] object-contain select-none"
          />
          <p className="text-xs text-white/50 mt-4">{t("ex.closeViewer")}</p>
        </div>
      )}
    </AppLayout>
  );
}
